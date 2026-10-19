package io.orbit.alerting.channel;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;
import io.orbit.alerting.IncidentEventType;
import io.orbit.alerting.IncidentListener;
import io.orbit.alerting.suppression.AlertDeduplicator;
import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.security.vault.SecretResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * BE-28: sends incident notifications (opened, reopened, severity change, resolved) to the channels in
 * orbit.channels.json, skipping silenced or maintained monitors (BE-31/BE-32), grouping duplicates
 * (BE-29) and delivering through {@link ReliableSender} (BE-36). Every text is masked before sending.
 */
public class NotificationDispatcher implements IncidentListener {

    private static final Logger LOG = LoggerFactory.getLogger(NotificationDispatcher.class);
    private static final Set<IncidentEventType> NOTIFY = Set.of(IncidentEventType.OPENED, IncidentEventType.REOPENED,
            IncidentEventType.SEVERITY_CHANGED, IncidentEventType.RESOLVED);

    /** HTTP POST port (java.net.http in production). */
    @FunctionalInterface
    public interface HttpPoster {
        void post(URI uri, Map<String, String> headers, String body) throws Exception;
    }

    /** What the dispatcher needs to know about the monitor behind an incident (already masked). */
    public record MonitorInfo(String name, String groupId, String detail) {
    }

    private final Supplier<List<ChannelDef>> channels;
    private final HttpPoster poster;
    private final SecretResolver secrets;
    private final AlertDeduplicator dedup;
    private final Predicate<String> suppressed;
    private final Function<String, Optional<MonitorInfo>> monitors;
    private final String linkBase;
    private final Clock clock;
    private final ReliableSender sender;
    private final SensitiveDataRedactor redactor = new SensitiveDataRedactor();

    public NotificationDispatcher(Supplier<List<ChannelDef>> channels, HttpPoster poster, SecretResolver secrets,
                                  AlertDeduplicator dedup, Predicate<String> suppressed,
                                  Function<String, Optional<MonitorInfo>> monitors, String linkBase, Clock clock) {
        this.channels = channels;
        this.poster = poster;
        this.secrets = secrets;
        this.dedup = dedup;
        this.suppressed = suppressed;
        this.monitors = monitors;
        this.linkBase = linkBase.endsWith("/") ? linkBase.substring(0, linkBase.length() - 1) : linkBase;
        this.clock = clock;
        this.sender = new ReliableSender(this::deliver, clock, 30, 3, Duration.ofSeconds(1), NotificationDispatcher::sleep);
    }

    @Override
    public void onIncident(Incident incident) {
        IncidentEvent last = incident.events().getLast();
        if (!NOTIFY.contains(last.type()) || suppressed.test(incident.monitorId())) {
            return;
        }
        MonitorInfo info = monitors.apply(incident.monitorId())
                .orElse(new MonitorInfo(incident.monitorId(), null, ""));
        ChannelPayloads.Notification notification = notification(incident, last.type(), info);
        for (ChannelDef channel : channels.get()) {
            if (!matches(channel, incident, info)) {
                continue;
            }
            String key = incident.monitorId() + "|" + last.type() + "|" + incident.severity() + "|" + channel.id();
            if (!dedup.shouldSend(key, clock.instant())) {
                continue;
            }
            ReliableSender.Outcome outcome = sender.send(channel.id(), payload(channel, notification));
            if (outcome != ReliableSender.Outcome.SENT) {
                LOG.warn("Notification to channel {} not delivered: {}", channel.id(), outcome);
            }
        }
    }

    /** BE-27: sends an escalation step to its channels (unless the monitor is silenced or in maintenance). */
    public void escalate(Incident incident, List<String> channelIds) {
        if (suppressed.test(incident.monitorId())) {
            return;
        }
        MonitorInfo info = monitors.apply(incident.monitorId())
                .orElse(new MonitorInfo(incident.monitorId(), null, ""));
        ChannelPayloads.Notification base = notification(incident, IncidentEventType.OPENED, info);
        ChannelPayloads.Notification escalation = new ChannelPayloads.Notification(base.incidentId(),
                base.monitorName(), base.severity(), "Escalation: " + base.title() + " (not acknowledged)",
                base.text(), base.link());
        for (ChannelDef channel : channels.get()) {
            if (channel.enabled() && channelIds.contains(channel.id())) {
                sender.send(channel.id(), payload(channel, escalation));
            }
        }
    }

    public List<ReliableSender.DeadLetter> deadLetters() {
        return sender.deadLetters();
    }

    private ChannelPayloads.Notification notification(Incident incident, IncidentEventType type, MonitorInfo info) {
        String title = switch (type) {
            case RESOLVED -> info.name() + " resolved";
            case SEVERITY_CHANGED -> info.name() + " is now " + incident.severity();
            default -> incident.severity() == MonitorState.DOWN ? info.name() + " is down" : info.name() + " needs attention";
        };
        String severity = type == IncidentEventType.RESOLVED ? "OK" : incident.severity().name();
        // Defense in depth: texts are masked again even though callers already pass masked values.
        return new ChannelPayloads.Notification(incident.id(), redactor.redactText(info.name()), severity,
                redactor.redactText(title), redactor.redactText(info.detail() == null ? "" : info.detail()),
                linkBase + "/incidents/" + incident.id());
    }

    private static boolean matches(ChannelDef channel, Incident incident, MonitorInfo info) {
        if (!channel.enabled()) {
            return false;
        }
        if (!channel.groupIds().isEmpty() && (info.groupId() == null || !channel.groupIds().contains(info.groupId()))) {
            return false;
        }
        boolean downOnly = "DOWN".equalsIgnoreCase(channel.minSeverity());
        return !downOnly || incident.severity() == MonitorState.DOWN;
    }

    private static String payload(ChannelDef channel, ChannelPayloads.Notification n) {
        return switch (channel.type()) {
            case SLACK -> ChannelPayloads.slack(n);
            case TEAMS -> ChannelPayloads.teams(n);
            case WEBHOOK -> ChannelPayloads.webhook(n);
        };
    }

    private void deliver(String channelId, String payload) throws Exception {
        ChannelDef channel = channels.get().stream().filter(c -> c.id().equals(channelId)).findFirst()
                .orElseThrow(() -> new IllegalStateException("Channel removed: " + channelId));
        Map<String, String> headers = new java.util.HashMap<>(Map.of("Content-Type", "application/json"));
        if (channel.type() == ChannelDef.Type.WEBHOOK && channel.signingSecret() != null) {
            headers.putAll(ChannelPayloads.signatureHeaders(payload, secrets.resolve(channel.signingSecret()),
                    clock.instant().getEpochSecond()));
        }
        poster.post(URI.create(secrets.resolve(channel.url())), headers, payload);
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
