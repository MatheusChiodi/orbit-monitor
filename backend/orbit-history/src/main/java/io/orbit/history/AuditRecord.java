package io.orbit.history;

import java.time.Instant;
import java.util.Objects;

/** Configuration change or preview execution (never its result); {@code detail} is redacted before writing. */
public record AuditRecord(Instant at, String actor, String action, String entity, String detail) {

    public AuditRecord {
        Objects.requireNonNull(at, "at");
        Objects.requireNonNull(action, "action");
    }
}
