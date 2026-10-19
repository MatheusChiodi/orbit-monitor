package io.orbit.history;

import java.time.Instant;

/**
 * Uptime and latency percentiles of one key over a range. Uptime counts WARN as up and leaves
 * UNKNOWN out, like the in-memory statistics; values are null without samples.
 */
public record HistorySummary(Instant from, Instant to, long samples, long down, Double uptimePercent,
                             Long p50, Long p95, Long p99) {
}
