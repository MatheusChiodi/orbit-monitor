package io.orbit.security.audit;

/**
 * Audit filter; null fields match everything.
 *
 * @param actionPrefix e.g. {@code select.} for every SELECT change
 * @param operator     case-insensitive substring of the operator name
 */
public record AuditQuery(String actionPrefix, String target, String operator) {

    public static AuditQuery all() {
        return new AuditQuery(null, null, null);
    }
}
