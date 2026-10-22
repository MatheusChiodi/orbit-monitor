package io.orbit.security.audit;

import java.time.Instant;

/**
 * One audit record: who (the client kind: loopback, lan or unknown), what, on which target, when and from where.
 * {@code detail} is already masked; probe results are never audited, only the query that ran.
 */
public record AuditEntry(Instant at, String operator, String action, String target, String detail,
                         String remoteAddress) {

    AuditEntry withOperator(String newOperator) {
        return new AuditEntry(at, newOperator, action, target, detail, remoteAddress);
    }
}
