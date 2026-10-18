package io.orbit.telemetry;

import io.orbit.common.MonitorState;

import java.util.List;

/** Uptime and nearest-rank percentiles over in-memory heartbeats. */
public final class Statistics {

    private Statistics() {
    }

    /** WARN counts as up; UNKNOWN (no data) is left out. */
    public static UptimeReport uptime(List<Heartbeat> heartbeats) {
        List<Heartbeat> counted = heartbeats.stream().filter(h -> h.state() != MonitorState.UNKNOWN).toList();
        if (counted.isEmpty()) {
            return new UptimeReport(Double.NaN, 0, null);
        }
        long up = counted.stream().filter(h -> h.state() != MonitorState.DOWN).count();
        return new UptimeReport((double) up / counted.size(), counted.size(), counted.getFirst().at());
    }

    /** Nearest-rank percentile, {@code 0 < p <= 100}. */
    public static long percentile(List<Long> values, double p) {
        if (p <= 0 || p > 100) {
            throw new IllegalArgumentException("Percentile must be in (0, 100]: " + p);
        }
        if (values.isEmpty()) {
            throw new IllegalArgumentException("No values");
        }
        List<Long> sorted = values.stream().sorted().toList();
        int rank = (int) Math.ceil(p / 100.0 * sorted.size());
        return sorted.get(Math.max(rank, 1) - 1);
    }

    public static Long percentileOrNull(List<Long> values, double p) {
        return values.isEmpty() ? null : percentile(values, p);
    }

    /** Percentiles over checks that answered (DOWN and UNKNOWN are excluded). */
    public static LatencySummary latency(List<Heartbeat> heartbeats) {
        List<Long> latencies = heartbeats.stream()
                .filter(h -> h.state() == MonitorState.OK || h.state() == MonitorState.WARN)
                .map(Heartbeat::latencyMs)
                .toList();
        return new LatencySummary(percentileOrNull(latencies, 50), percentileOrNull(latencies, 95),
                percentileOrNull(latencies, 99), latencies.size());
    }
}
