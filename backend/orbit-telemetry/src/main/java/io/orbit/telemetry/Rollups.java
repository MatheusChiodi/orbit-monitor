package io.orbit.telemetry;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/** BE-19: 1-minute and 1-hour rollups computed from the in-memory heartbeats. */
public final class Rollups {

    /** @param upRatio share of non-DOWN checks; min/max/avg over the primary value (null without values) */
    public record Rollup(Instant start, int count, Double min, Double max, Double avg, double upRatio, long p95Latency) {
    }

    private Rollups() {
    }

    /** Buckets aligned to {@code bucket} (e.g. 1 min, 1 h), oldest first; empty buckets are omitted. */
    public static List<Rollup> of(List<Heartbeat> heartbeats, Duration bucket) {
        throw new UnsupportedOperationException("BE-19 rollups are not implemented yet");
    }
}
