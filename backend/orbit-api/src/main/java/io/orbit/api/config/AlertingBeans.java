package io.orbit.api.config;

import io.orbit.alerting.IncidentService;
import io.orbit.alerting.channel.ChannelDef;
import io.orbit.alerting.channel.NotificationDispatcher;
import io.orbit.alerting.escalation.EscalationPolicy;
import io.orbit.alerting.escalation.EscalationRunner;
import io.orbit.alerting.suppression.AlertDeduplicator;
import io.orbit.alerting.suppression.CascadeResolver;
import io.orbit.alerting.suppression.Dependency;
import io.orbit.alerting.suppression.DependencyGraph;
import io.orbit.alerting.suppression.MaintenanceWindow;
import io.orbit.alerting.suppression.SilenceService;
import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckResult;
import io.orbit.probe.http.HostResolver;
import io.orbit.probe.http.SsrfGuard;
import io.orbit.security.vault.SecretResolver;
import io.orbit.telemetry.FlappingDetector;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
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

    /** BE-25: 4 confirmed changes within 10 minutes = flapping; the incident service keeps one incident. */
    @Bean
    FlappingDetector flappingDetector(IncidentService incidents) {
        FlappingDetector detector = new FlappingDetector(4, Duration.ofMinutes(10));
        incidents.setFlapping(new IncidentService.Flapping() {
            @Override
            public boolean observe(MonitorStateChanged change) {
                return detector.observe(change);
            }

            @Override
            public boolean isFlapping(String monitorId, Instant now) {
                return detector.isFlapping(monitorId, now);
            }
        });
        return detector;
    }

    /** BE-30: edges of orbit.dependencies.json; a cycle or self-loop makes the file invalid. */
    @Bean
    ConfigFile<Dependency> dependencyFile(OrbitProperties properties) {
        return new ConfigFile<>(properties.configDir(), "dependencies", Dependency.class, ConfigMapper.create(),
                items -> {
                    try {
                        DependencyGraph.of(items);
                        return List.of();
                    } catch (IllegalArgumentException e) {
                        return List.of(e.getMessage());
                    }
                });
    }

    /** BE-30: a new incident whose upstream already has an open DOWN incident collapses into it. */
    @Bean
    CascadeResolver cascadeResolver(ConfigFile<Dependency> dependencyFile, MonitorDefinitions definitions,
                                    IncidentService incidents) {
        CascadeResolver resolver = new CascadeResolver(() -> DependencyGraph.of(dependencyFile.items()),
                monitorId -> definitions.monitor(monitorId).map(MonitorDef::groupId),
                groupId -> definitions.monitors().stream().filter(m -> groupId.equals(m.groupId()))
                        .map(MonitorDef::id).toList(),
                incidents::openIncident);
        incidents.setUpstream(resolver::upstreamIncident);
        return resolver;
    }

    @Bean
    ConfigFile<EscalationPolicy> escalationFile(OrbitProperties properties) {
        return new ConfigFile<>(properties.configDir(), "escalation", EscalationPolicy.class, ConfigMapper.create(),
                items -> items.stream().filter(p -> p.steps().isEmpty()).map(p -> p.id() + ": at least one step")
                        .toList());
    }

    @Bean
    EscalationRunner escalationRunner(ConfigFile<EscalationPolicy> escalationFile, IncidentService incidents,
                                      MonitorDefinitions definitions, NotificationDispatcher dispatcher, Clock clock) {
        return new EscalationRunner(escalationFile::items, incidents,
                monitorId -> definitions.monitor(monitorId).map(MonitorDef::groupId), dispatcher::escalate, clock);
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
