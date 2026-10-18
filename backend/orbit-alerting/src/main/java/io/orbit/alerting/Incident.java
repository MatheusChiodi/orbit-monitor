package io.orbit.alerting;

import io.orbit.common.MonitorState;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Immutable incident snapshot; every change produces a new instance with one more timeline event. */
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
        List<IncidentEvent> events) {

    public static final String SYSTEM_ACTOR = "orbit";

    public Incident {
        events = List.copyOf(events);
    }

    static Incident open(String id, String monitorId, MonitorState severity, Instant at) {
        return new Incident(id, monitorId, IncidentStatus.OPEN, severity, at, null, null, null, null,
                List.of(new IncidentEvent(IncidentEventType.OPENED, SYSTEM_ACTOR, at, severity.name())));
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
                ticket, append(IncidentEventType.SEVERITY_CHANGED, SYSTEM_ACTOR, at, severity + " -> " + newSeverity));
    }

    Incident resolve(Instant at) {
        return new Incident(id, monitorId, IncidentStatus.RESOLVED, severity, openedAt, at, acknowledgedBy,
                acknowledgedAt, ticket, append(IncidentEventType.RESOLVED, SYSTEM_ACTOR, at, null));
    }

    Incident reopen(MonitorState newSeverity, Instant at) {
        return new Incident(id, monitorId, IncidentStatus.OPEN, newSeverity, openedAt, null, acknowledgedBy,
                acknowledgedAt, ticket, append(IncidentEventType.REOPENED, SYSTEM_ACTOR, at, newSeverity.name()));
    }

    Incident acknowledge(String operator, Instant at) {
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, operator, at, ticket,
                append(IncidentEventType.ACKNOWLEDGED, operator, at, null));
    }

    Incident comment(String operator, String text, Instant at) {
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt,
                ticket, append(IncidentEventType.COMMENTED, operator, at, text));
    }

    Incident linkTicket(String operator, String newTicket, Instant at) {
        return new Incident(id, monitorId, status, severity, openedAt, resolvedAt, acknowledgedBy, acknowledgedAt,
                newTicket, append(IncidentEventType.TICKET_LINKED, operator, at, newTicket));
    }

    private List<IncidentEvent> append(IncidentEventType type, String actor, Instant at, String detail) {
        List<IncidentEvent> list = new ArrayList<>(events);
        list.add(new IncidentEvent(type, actor, at, detail));
        return list;
    }
}
