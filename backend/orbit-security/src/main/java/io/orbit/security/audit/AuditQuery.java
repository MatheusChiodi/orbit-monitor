package io.orbit.security.audit;

import java.time.Instant;

/**
 * Audit filter; null fields match everything.
 *
 * @param actionPrefix e.g. {@code select.} for every SELECT change
 * @param operator     case-insensitive substring of the operator name
 * @param from         inclusive start of the time range
 * @param to           exclusive end of the time range
 */
public record AuditQuery(String actionPrefix, String target, String operator, Instant from, Instant to) {

    public AuditQuery {
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("The end of the time range is before its start");
        }
    }

    public AuditQuery(String actionPrefix, String target, String operator) {
        this(actionPrefix, target, operator, null, null);
    }

    public static AuditQuery all() {
        return new AuditQuery(null, null, null, null, null);
    }
}
