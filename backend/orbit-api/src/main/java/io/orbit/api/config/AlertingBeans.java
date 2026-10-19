package io.orbit.api.config;

import io.orbit.alerting.channel.ChannelDef;
import io.orbit.alerting.channel.NotificationDispatcher;
import io.orbit.alerting.suppression.AlertDeduplicator;
import io.orbit.alerting.suppression.MaintenanceWindow;
import io.orbit.alerting.suppression.SilenceService;
import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckResult;
import io.orbit.probe.http.HostResolver;
import io.orbit.probe.http.SsrfGuard;
import io.orbit.security.vault.SecretResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

/** Channels, silences, maintenance windows and the notification dispatcher subscribed to incidents. */
@Configuration
public class AlertingBeans {

    @Bean
    ConfigFile<ChannelDef> channelFile(OrbitProperties properties) {
        return new ConfigFile<>(properties.configDir(), "channels", ChannelDef.class, ConfigMapper.create(), items -> {
            List<String> errors = new ArrayList<>();
            for (ChannelDef c : items) {
                if (c.type() == null) {
                    errors.add(c.id() + ": type is required (SLACK, TEAMS or WEBHOOK)");
                }
                if (c.url() == null) {
                    errors.add(c.id() + ": url is required");
                }
                if (!"WARN".equals(c.minSeverity()) && !"DOWN".equals(c.minSeverity())) {
                    errors.add(c.id() + ": minSeverity must be WARN or DOWN");
                }
            }
            return errors;
        });
    }

    @Bean
    SilenceService silenceService(OrbitProperties properties, Clock clock) {
        return new SilenceService(new ConfigFile<>(properties.configDir(), "silences", SilenceService.Silence.class,
                ConfigMapper.create(), items -> List.of()), clock);
    }

    @Bean
    ConfigFile<MaintenanceWindow> maintenanceFile(OrbitProperties properties) {
        return new ConfigFile<>(properties.configDir(), "maintenance", MaintenanceWindow.class, ConfigMapper.create(),
                items -> List.of());
    }

    @Bean
    NotificationDispatcher notificationDispatcher(ConfigFile<ChannelDef> channelFile, SilenceService silences,
                                                  ConfigFile<MaintenanceWindow> maintenanceFile,
                                                  MonitorDefinitions definitions, MonitorRuntime runtime,
                                                  SecretResolver secrets, OrbitProperties properties, Clock clock,
                                                  EventBus bus) {
        SsrfGuard guard = new SsrfGuard(HostResolver.system(), new HashSet<>(properties.http().allowlist()),
                properties.http().blockPrivate());
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        NotificationDispatcher.HttpPoster poster = (uri, headers, body) -> {
            guard.check(uri);
            HttpRequest.Builder request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(body));
            headers.forEach(request::header);
            int status = client.send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
            if (status >= 300) {
                throw new IllegalStateException("Channel answered HTTP " + status);
            }
        };
        NotificationDispatcher dispatcher = new NotificationDispatcher(channelFile::items, poster, secrets,
                new AlertDeduplicator(Duration.ofMinutes(5)),
                monitorId -> suppressed(monitorId, definitions, silences, maintenanceFile, clock),
                monitorId -> definitions.monitor(monitorId).map(m -> info(m, runtime.latest(monitorId))),
                properties.publicUrl(), clock);
        bus.onIncident(dispatcher);
        return dispatcher;
    }

    /** Silenced or in maintenance, by monitor id or by its group. */
    private static boolean suppressed(String monitorId, MonitorDefinitions definitions, SilenceService silences,
                                      ConfigFile<MaintenanceWindow> maintenance, Clock clock) {
        String groupId = definitions.monitor(monitorId).map(MonitorDef::groupId).orElse(null);
        if (silences.isSilenced(monitorId) || groupId != null && silences.isSilenced(groupId)) {
            return true;
        }
        return maintenance.items().stream().anyMatch(w -> w.covers(monitorId, clock.instant())
                || groupId != null && w.covers(groupId, clock.instant()));
    }

    private static NotificationDispatcher.MonitorInfo info(MonitorDef monitor, Optional<CheckResult> latest) {
        String detail = latest.map(r -> r.error() != null ? r.error()
                : r.conditions().stream().filter(c -> !c.passed()).map(ConditionResult::message).findFirst().orElse(""))
                .orElse("");
        return new NotificationDispatcher.MonitorInfo(monitor.name(), monitor.groupId(), detail);
    }
}
