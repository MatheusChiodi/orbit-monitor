package io.orbit.telemetry;

/** Latency percentiles in ms over successful checks; values are null without samples. */
public record LatencySummary(Long p50, Long p95, Long p99, int samples) {
}
