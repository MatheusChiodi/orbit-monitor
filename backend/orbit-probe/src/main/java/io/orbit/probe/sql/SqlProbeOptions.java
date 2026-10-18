package io.orbit.probe.sql;

import java.time.Duration;

/** Limits applied to every SQL check: row cap, statement timeout and JDBC fetch size. */
public record SqlProbeOptions(int maxRows, Duration timeout, int fetchSize) {

    public SqlProbeOptions {
        if (maxRows <= 0) {
            throw new IllegalArgumentException("maxRows must be positive");
        }
        if (timeout == null || timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("timeout must be positive");
        }
        if (fetchSize <= 0) {
            throw new IllegalArgumentException("fetchSize must be positive");
        }
    }

    public static SqlProbeOptions defaults() {
        return new SqlProbeOptions(500, Duration.ofSeconds(30), 100);
    }

    /** JDBC timeouts are whole seconds; round up so a 2.5 s budget never becomes 2 s. */
    int timeoutSeconds() {
        return (int) Math.max(1, (timeout.toMillis() + 999) / 1000);
    }
}
