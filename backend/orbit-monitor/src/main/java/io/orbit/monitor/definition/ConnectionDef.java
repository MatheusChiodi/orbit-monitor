package io.orbit.monitor.definition;

import io.orbit.config.ConfigItem;
import io.orbit.security.vault.SecretRef;

import java.time.Instant;

/**
 * A target database registered by the operator (orbit.connections.json). The user should be
 * read-only ({@code GRANT SELECT} on the needed views); the password is a vault reference.
 */
public record ConnectionDef(
        String id,
        String name,
        String jdbcUrl,
        String username,
        SecretRef password,
        int poolSize,
        Instant updatedAt,
        String updatedBy) implements ConfigItem {

    ConnectionDef touchedBy(String operator, Instant at) {
        return new ConnectionDef(id, name, jdbcUrl, username, password, poolSize, at, operator);
    }
}
