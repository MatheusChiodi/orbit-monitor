package io.orbit.security.access;

/** Kinds of requests the access policy distinguishes. */
public enum AccessAction {
    READ,
    /** Acknowledge or comment an incident: allowed for view-only clients such as the TV when enabled. */
    ACKNOWLEDGE,
    MUTATE
}
