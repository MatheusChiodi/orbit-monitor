package io.orbit.alerting;

/** Entries of the incident timeline. */
public enum IncidentEventType {
    OPENED,
    SEVERITY_CHANGED,
    ACKNOWLEDGED,
    COMMENTED,
    TICKET_LINKED,
    RESOLVED,
    REOPENED,
    /** BE-25: the monitor started flapping; one incident is kept until it settles. */
    FLAPPING_STARTED,
    /** BE-25: the monitor stopped flapping. */
    FLAPPING_STOPPED,
    /** BE-30: on a downstream incident, the upstream incident id; on the upstream one, the downstream monitor id. */
    CORRELATED
}
