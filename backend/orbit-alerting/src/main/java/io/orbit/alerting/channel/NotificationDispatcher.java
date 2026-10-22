package io.orbit.alerting.channel;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;
import io.orbit.alerting.IncidentEventType;
import io.orbit.alerting.IncidentListener;
import io.orbit.alerting.suppression.AlertDeduplicator;
import io.orbit.alerting.template.TemplateCatalog;
import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.security.vault.SecretResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * BE-28: sends incident notifications (opened, reopened, severity change, flapping, resolved) to the
 * channels in orbit.channels.json, skipping silenced or maintained monitors (BE-31/BE-32) and incidents
 * collapsed into an upstream one (BE-30), grouping duplicates (BE-29) and delivering through
 * {@link ReliableSender} (BE-36). Texts come from the templates (BE-35) in the channel's language and
 * every value is masked before sending.
 */
public class NotificationDispatcher implements IncidentListener {

    private static final Logger LOG = LoggerFactory.getLogger(NotificationDispatcher.class);
    private static final Set<IncidentEventType> NOTIFY = Set.of(IncidentEventType.OPENED, IncidentEventType.REOPENED,
            IncidentEventType.SEVERITY_CHANGED, IncidentEventType.RESOLVED, IncidentEventType.FLAPPING_STARTED);

    /** HTTP POST port (java.net.http in production). */
    @FunctionalInterface
    public interface HttpPoster {
        void post(URI uri, Map<String, String> headers, String body) throws Exception;
    }

    /** What the dispatcher needs to know about the monitor behind an incident (already masked). */
    public record MonitorInfo(String name, String groupId, String detail) {
    }

    private final Supplier<List<ChannelDef>> channels;
    private final ChannelDelivery delivery;
    private final TemplateCatalog templates;
    private final AlertDeduplicator dedup;
    private final Predicate<String> suppressed;
    private final Function<String, Optional<MonitorInfo>> monitors;
    private final String linkBase;
    private final Clock clock;
    private final ReliableSender sender;
    private final SensitiveDataRedactor redactor = new SensitiveDataRedactor();

    public NotificationDispatcher(Supplier<List<ChannelDef>> channels, ChannelDelivery delivery,
                                  TemplateCatalog templates, AlertDeduplicator dedup, Predicate<String> suppressed,
                                  Function<String, Optional<MonitorInfo>> monitors, String linkBase, Clock clock) {
        this.channels = channels;
        this.delivery = delivery;
        this.templates = templates;
        this.dedup = dedup;
        this.suppressed = suppressed;
        this.monitors = monitors;
        this.linkBase = linkBase.endsWith("/") ? linkBase.substring(0, linkBase.length() - 1) : linkBase;
        this.clock = clock;
        this.sender = new ReliableSender(this::deliver, clock, 30, 3, Duration.ofSeconds(1), NotificationDispatcher::sleep);
    }

    /** Webhook channels only (no e-mail transport) with the built-in templates. */
    public NotificationDispatcher(Supplier<List<ChannelDef>> channels, HttpPoster poster, SecretResolver secrets,
                                  AlertDeduplicator dedup, Predicate<String> suppressed,
                                  Function<String, Optional<MonitorInfo>> monitors, String linkBase, Clock clock) {
        this(channels, new ChannelDelivery(poster, message -> {
            throw new IllegalStateException("E-mail is not configured");
        }, secrets, clock), new TemplateCatalog(List::of), dedup, suppressed, monitors, linkBase, clock);
    }

    @Override
    public void onIncident(Incident incident) {
        IncidentEvent last = incident.events().getLast();
        // BE-30: a downstream incident collapsed into its upstream one is told through the upstream incident.
        if (!NOTIFY.contains(last.type()) || incident.parentId() != null || suppressed.test(incident.monitorId())) {
            return;
        }
        MonitorInfo info = info(incident);
        String template = switch (last.type()) {
            case REOPENED -> "incident.reopened";
            case SEVERITY_CHANGED -> "incident.severity";
            case RESOLVED -> "incident.resolved";
            case FLAPPING_STARTED -> "incident.flapping";
            default -> incident.severity() == MonitorState.DOWN ? "incident.down" : "incident.warn";
        };
        String severity = last.type() == IncidentEventType.RESOLVED ? "OK" : incident.severity().name();
        Map<String, Object> vars = variables(incident, info, severity);
        for (ChannelDef channel : channels.get()) {
            if (!matches(channel, incident, info)) {
                continue;
            }
            String key = incident.monitorId() + "|" + last.type() + "|" + incident.severity() + "|" + channel.id();
            if (!dedup.shouldSend(key, clock.instant())) {
                continue;
            }
            send(channel, notification(incident, info, severity, template, vars, channel, null));
        }
    }

    /** BE-27: sends an escalation step to its channels (unless the monitor is silenced or in maintenance). */
    public void escalate(Incident incident, List<String> channelIds) {
        escalate(incident, channelIds, null, null);
    }

    /** BE-27/BE-33: an escalation step; {@code onCall} (may be null) is named in the message. */
    public void escalate(Incident incident, List<String> channelIds, String onCall) {
        escalate(incident, channelIds, null, onCall);
    }

    /** BE-27/BE-33: escalation step {@code stepName}; {@code onCall} (may be null) is named in the message. */
    public void escalate(Incident incident, List<String> channelIds, String stepName, String onCall) {
        if (suppressed.test(incident.monitorId())) {
            return;
        }
        MonitorInfo info = info(incident);
        Map<String, Object> vars = variables(incident, info, incident.severity().name());
        vars.put("step", stepName == null ? "Escalation" : stepName);
        if (onCall != null) {
            vars.put("onCall", onCall);
        }
        for (ChannelDef channel : channels.get()) {
            if (channel.enabled() && channelIds.contains(channel.id())) {
                send(channel, notification(incident, info, incident.severity().name(), "incident.escalation", vars,
                        channel, onCall));
            }
        }
    }

    /**
     * Sends the "channel.test" message straight to {@code channel} (no retries, no rate limit) so the
     * console can check a channel; throws with the provider's (masked) error when it fails.
     */
    public void test(ChannelDef channel) throws Exception {
        Locale locale = Locale.forLanguageTag(channel.locale());
        TemplateCatalog.Rendered rendered = templates.render("channel.test", locale, Map.of());
        ChannelPayloads.Notification notification = new ChannelPayloads.Notification("test", "Orbit", "OK",
                rendered.title(), rendered.text(), linkBase);
        for (String payload : delivery.payloads(channel, notification)) {
            delivery.deliver(channel, payload);
        }
    }

    public List<ReliableSender.DeadLetter> deadLetters() {
        return sender.deadLetters();
    }

    private void send(ChannelDef channel, ChannelPayloads.Notification notification) {
        for (String payload : delivery.payloads(channel, notification)) {
            ReliableSender.Outcome outcome = sender.send(channel.id(), payload);
            if (outcome != ReliableSender.Outcome.SENT) {
                LOG.warn("Notification to channel {} not delivered: {}", channel.id(), outcome);
            }
        }
    }

    private MonitorInfo info(Incident incident) {
        return monitors.apply(incident.monitorId()).orElse(new MonitorInfo(incident.monitorId(), null, ""));
    }

    private Map<String, Object> variables(Incident incident, MonitorInfo info, String severity) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("monitor", info.name());
        vars.put("group", info.groupId() == null ? "" : info.groupId());
        vars.put("severity", severity);
        vars.put("detail", info.detail() == null ? "" : info.detail());
        vars.put("link", link(incident));
        vars.put("incidentId", incident.id());
        vars.put("openedAt", incident.openedAt().toString());
        vars.put("duration", incident.duration() == null ? "" : human(incident.duration()));
        vars.put("ticket", incident.ticket() == null ? "" : incident.ticket());
        return vars;
    }

    private ChannelPayloads.Notification notification(Incident incident, MonitorInfo info, String severity,
                                                      String template, Map<String, Object> vars, ChannelDef channel,
                                                      String onCall) {
        Locale locale = Locale.forLanguageTag(channel.locale());
        TemplateCatalog.Rendered rendered = templates.render(template, locale, vars);
        String text = rendered.text();
        if (onCall != null) {
            text = text + "\n" + templates.render("incident.oncall", locale, vars).text();
        }
        // Defense in depth: texts are masked again even though the templates already mask every value.
        return new ChannelPayloads.Notification(incident.id(), redactor.redactText(info.name()), severity,
                redactor.redactText(rendered.title()), redactor.redactText(text), link(incident));
    }

    private String link(Incident incident) {
        return linkBase + "/incidents/" + incident.id();
    }

    private static String human(Duration d) {
        long minutes = d.toMinutes();
        if (minutes < 1) {
            return d.toSeconds() + " s";
        }
        return minutes < 60 ? minutes + " min" : d.toHours() + " h " + d.toMinutesPart() + " min";
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

    private void deliver(String channelId, String payload) throws Exception {
        ChannelDef channel = channels.get().stream().filter(c -> c.id().equals(channelId)).findFirst()
                .orElseThrow(() -> new IllegalStateException("Channel removed: " + channelId));
        delivery.deliver(channel, payload);
    }

    private static void sleep(Duration duration) {
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
