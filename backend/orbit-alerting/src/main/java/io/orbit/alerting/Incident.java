package io.orbit.alerting;

import io.orbit.common.MonitorState;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Immutable incident snapshot; every change produces a new instance with one more timeline event.
 *
 * @param flapping BE-25: the monitor keeps changing state; the incident stays open until it settles
 * @param parentId BE-30: open upstream incident this one collapses into (no notification of its own)
 */
public record Incident(
        String id,
        String monitorId,
        IncidentStatus status,
        MonitorState severity,
        Instant openedAt,
        Instant resolvedAt,
        String acknowledgedBy,
        Instant acknowledgedAt,
        String ticket,
        boolean flapping,
        String parentId,
        List<IncidentEvent> events) {

    public static final String SYSTEM_ACTOR = "orbit";

    public Incident {
        events = List.copyOf(events);
    }

    static Incident open(String id, String monitorId, MonitorState severity, Instant at, String parentId) {
        List<IncidentEvent> events = new ArrayList<>();
        events.add(new IncidentEvent(IncidentEventType.OPENED, SYSTEM_ACTOR, at, severity.name()));
        if (parentId != null) {
            events.add(new IncidentEvent(IncidentEventType.CORRELATED, SYSTEM_ACTOR, at, parentId));
        }
        return new Incident(id, monitorId, IncidentStatus.OPEN, severity, at, null, null, null, null, false, parentId,
                events);
    }

    public boolean isOpen() {
        return status == IncidentStatus.OPEN;
    }

    /** Time from opening to resolution; null while still open. */
    public Duration duration() {
        return resolvedAt == null ? null : Duration.between(openedAt, resolvedAt);
    }

    public Duration timeToAcknowledge() {
        return acknowledgedAt == null ? null : Duration.between(openedAt, acknowledgedAt);
    }

    Incident withSeverity(MonitorState newSeverity, Instant at) {
        return new Incident(id, monitorId, status, newSeverity, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt,
                ticket, flapping, parentId,
                append(IncidentEventType.SEVERITY_CHANGED, SYSTEM_ACTOR, at, severity + " -> " + newSeverity));
    }

    Incident resolve(Instant at) {
        return resolve(SYSTEM_ACTOR, at);
    }

    /** Resolved automatically on recovery ({@link #SYSTEM_ACTOR}) or by an operator. */
    Incident resolve(String actor, Instant at) {
        return new Incident(id, monitorId, IncidentStatus.RESOLVED, severity, openedAt, at, acknowledgedBy,
                acknowledgedAt, ticket, false, parentId, append(IncidentEventType.RESOLVED, actor, at, null));
    }

    Incident reopen(MonitorState newSeverity, Instant at) {
        return new Incident(id, monitorId, IncidentStatus.OPEN, newSeverity, openedAt, null, acknowledgedBy,
                acknowledgedAt, ticket, flapping, parentId,
                append(IncidentEventType.REOPENED, SYSTEM_ACTOR, at, newSeverity.name()));
    }

    /** Reopened by an operator: the acknowledgement is cleared so escalation and acknowledgement start again. */
    Incident reopenBy(String operator, Instant at) {
        return new Incident(id, monitorId, IncidentStatus.OPEN, severity, openedAt, null, null, null, ticket, false,
                parentId, append(IncidentEventType.REOPENED, operator, at, severity.name()));
    }

    Incident acknowledge(String operator, Instant at) {
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, operator, at, ticket, flapping,
                parentId, append(IncidentEventType.ACKNOWLEDGED, operator, at, null));
    }

    Incident comment(String operator, String text, Instant at) {
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt,
                ticket, flapping, parentId, append(IncidentEventType.COMMENTED, operator, at, text));
    }

    Incident linkTicket(String operator, String newTicket, Instant at) {
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt,
                newTicket, flapping, parentId, append(IncidentEventType.TICKET_LINKED, operator, at, newTicket));
    }

    /** BE-25: flapping started ({@code true}) or the monitor settled ({@code false}). */
    Incident withFlapping(boolean nowFlapping, Instant at) {
        IncidentEventType type = nowFlapping ? IncidentEventType.FLAPPING_STARTED : IncidentEventType.FLAPPING_STOPPED;
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt,
                ticket, nowFlapping, parentId, append(type, SYSTEM_ACTOR, at, null));
    }

    /** BE-30: a downstream monitor's incident collapsed into this one. */
    Incident correlate(String downstreamMonitorId, Instant at) {
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt,
                ticket, flapping, parentId,
                append(IncidentEventType.CORRELATED, SYSTEM_ACTOR, at, downstreamMonitorId));
    }

    /** BE-45: this incident with {@code operator} replaced by {@code replacement}; the same instance when absent. */
    Incident anonymize(String operator, String replacement) {
        boolean inEvents = events.stream().anyMatch(e -> operator.equals(e.actor()));
        if (!operator.equals(acknowledgedBy) && !inEvents) {
            return this;
        }
        List<IncidentEvent> renamed = events.stream()
                .map(e -> operator.equals(e.actor()) ? new IncidentEvent(e.type(), replacement, e.at(), e.detail()) : e)
                .toList();
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt,
                operator.equals(acknowledgedBy) ? replacement : acknowledgedBy, acknowledgedAt, ticket, flapping,
                parentId, renamed);
    }

    private List<IncidentEvent> append(IncidentEventType type, String actor, Instant at, String detail) {
        List<IncidentEvent> list = new ArrayList<>(events);
        list.add(new IncidentEvent(type, actor, at, detail));
        return list;
    }
}
