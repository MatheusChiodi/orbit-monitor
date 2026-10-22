package io.orbit.alerting;

import io.orbit.common.MonitorState;
import io.orbit.common.OperatorName;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.common.event.StateChangeListener;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * Incident lifecycle driven by confirmed state changes: opens on DOWN (or WARN when the monitor
 * is configured for it), follows severity changes, resolves on recovery and reopens a relapse
 * inside the reopen window. Operators acknowledge, comment and link tickets by self-declared name.
 */
public class IncidentService implements StateChangeListener {

    public static final Duration RESOLVED_RETENTION = Duration.ofHours(24);
    /** Replacement for an anonymized operator name; same marker as the audit log. */
    public static final String ANONYMIZED = "anonymized";
    private static final int MAX_TEXT = 2_000;

    private final IncidentRepository repository;
    private final Predicate<String> opensOnWarn;
    private final IncidentListener listener;
    private final Clock clock;
    private final Duration reopenWindow;

    public IncidentService(IncidentRepository repository, Predicate<String> opensOnWarn, IncidentListener listener,
                           Clock clock, Duration reopenWindow) {
        this.repository = repository;
        this.opensOnWarn = opensOnWarn;
        this.listener = listener;
        this.clock = clock;
        this.reopenWindow = reopenWindow;
    }

    @Override
    public synchronized void onStateChanged(MonitorStateChanged event) {
        Optional<Incident> open = repository.findOpenByMonitor(event.monitorId());
        MonitorState state = event.current();
        if (state == MonitorState.OK) {
            open.ifPresent(i -> store(i.resolve(event.at())));
            return;
        }
        boolean opens = state == MonitorState.DOWN || (state == MonitorState.WARN && opensOnWarn.test(event.monitorId()));
        if (open.isPresent()) {
            Incident incident = open.get();
            if ((state == MonitorState.DOWN || state == MonitorState.WARN) && incident.severity() != state) {
                store(incident.withSeverity(state, event.at()));
            }
        } else if (opens) {
            store(relapse(event).orElseGet(() ->
                    Incident.open(newId(), event.monitorId(), state, event.since() == null ? event.at() : event.since())));
        }
    }

    private Optional<Incident> relapse(MonitorStateChanged event) {
        return repository.findLatestByMonitor(event.monitorId())
                .filter(i -> !i.isOpen() && !i.resolvedAt().plus(reopenWindow).isBefore(event.at()))
                .map(i -> i.reopen(event.current(), event.at()));
    }

    public synchronized Incident acknowledge(String incidentId, String operator) {
        String name = OperatorName.normalize(operator);
        Incident incident = require(incidentId);
        if (!incident.isOpen()) {
            throw new IllegalStateException("Incident is already resolved: " + incidentId);
        }
        if (incident.acknowledgedBy() != null) {
            return incident;
        }
        return store(incident.acknowledge(name, clock.instant()));
    }

    public synchronized Incident comment(String incidentId, String operator, String text) {
        return store(require(incidentId).comment(OperatorName.normalize(operator), boundedText(text), clock.instant()));
    }

    public synchronized Incident linkTicket(String incidentId, String operator, String ticket) {
        return store(require(incidentId).linkTicket(OperatorName.normalize(operator), boundedText(ticket),
                clock.instant()));
    }

    /** BE-45: replaces a self-declared operator name in acknowledgements and timelines; returns how many changed. */
    public synchronized int anonymize(String operator) {
        String name = OperatorName.normalize(operator);
        int changed = 0;
        for (Incident incident : repository.findAll()) {
            Incident anonymized = incident.anonymize(name, ANONYMIZED);
            if (anonymized != incident) {
                store(anonymized);
                changed++;
            }
        }
        return changed;
    }

    public Optional<Incident> openIncident(String monitorId) {
        return repository.findOpenByMonitor(monitorId);
    }

    public Optional<Incident> find(String incidentId) {
        return repository.findById(incidentId);
    }

    /** Open incidents and those resolved in the last 24 h, newest first. */
    public List<Incident> recent() {
        repository.deleteResolvedBefore(clock.instant().minus(RESOLVED_RETENTION));
        return repository.findAll();
    }

    private Incident require(String incidentId) {
        return repository.findById(incidentId).orElseThrow(() -> new IncidentNotFoundException(incidentId));
    }

    private Incident store(Incident incident) {
        repository.save(incident);
        listener.onIncident(incident);
        return incident;
    }

    private static String boundedText(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text is required");
        }
        String trimmed = text.strip();
        return trimmed.length() > MAX_TEXT ? trimmed.substring(0, MAX_TEXT) : trimmed;
    }

    private static String newId() {
        return "inc_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
