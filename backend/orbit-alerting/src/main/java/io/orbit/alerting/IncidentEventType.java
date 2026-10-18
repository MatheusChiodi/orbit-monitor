package io.orbit.alerting;

/** Entries of the incident timeline. */
public enum IncidentEventType {
    OPENED,
    SEVERITY_CHANGED,
    ACKNOWLEDGED,
    COMMENTED,
    TICKET_LINKED,
    RESOLVED,
    REOPENED
}
