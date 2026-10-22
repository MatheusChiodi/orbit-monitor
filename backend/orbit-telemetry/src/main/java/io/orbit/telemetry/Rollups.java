package io.orbit.telemetry;

import io.orbit.common.MonitorState;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** BE-19: 1-minute and 1-hour rollups computed from the in-memory heartbeats. */
public final class Rollups {

    /** @param upRatio share of non-DOWN checks; min/max/avg over the primary value (null without values) */
    public record Rollup(Instant start, int count, Double min, Double max, Double avg, double upRatio, long p95Latency) {
    }

    private Rollups() {
    }

    /** Buckets aligned to {@code bucket} (e.g. 1 min, 1 h), oldest first; empty buckets are omitted. */
    public static List<Rollup> of(List<Heartbeat> heartbeats, Duration bucket) {
        long size = bucket.toMillis();
        if (size <= 0) {
            throw new IllegalArgumentException("Bucket must be positive: " + bucket);
        }
        Map<Long, List<Heartbeat>> buckets = new TreeMap<>();
        for (Heartbeat h : heartbeats) {
            long start = Math.floorDiv(h.at().toEpochMilli(), size) * size;
            buckets.computeIfAbsent(start, k -> new ArrayList<>()).add(h);
        }
        List<Rollup> rollups = new ArrayList<>(buckets.size());
        buckets.forEach((start, beats) -> rollups.add(rollup(Instant.ofEpochMilli(start), beats)));
        return rollups;
    }

    /** p95 latency over checks that answered (as in {@link Statistics#latency}); 0 when none did. */
    private static Rollup rollup(Instant start, List<Heartbeat> beats) {
        double min = Double.POSITIVE_INFINITY;
        double max = Double.NEGATIVE_INFINITY;
        double sum = 0;
        int values = 0;
        int up = 0;
        for (Heartbeat h : beats) {
            if (h.state() != MonitorState.DOWN) {
                up++;
            }
            Double value = h.value();
            if (value != null && !value.isNaN()) {
                min = Math.min(min, value);
                max = Math.max(max, value);
                sum += value;
                values++;
            }
        }
        Long p95 = Statistics.latency(beats).p95();
        boolean hasValues = values > 0;
        return new Rollup(start, beats.size(), hasValues ? min : null, hasValues ? max : null,
                hasValues ? sum / values : null, (double) up / beats.size(), p95 == null ? 0 : p95);
    }
}
