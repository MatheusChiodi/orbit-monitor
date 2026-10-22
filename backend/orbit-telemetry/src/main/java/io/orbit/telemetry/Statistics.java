package io.orbit.telemetry;

import io.orbit.common.MonitorState;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
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

    /** BE-20: uptime that leaves out heartbeats inside maintenance windows. */
    public static UptimeReport uptime(List<Heartbeat> heartbeats, List<TimeRange> excluded) {
        if (excluded.isEmpty()) {
            return uptime(heartbeats);
        }
        return uptime(heartbeats.stream()
                .filter(h -> excluded.stream().noneMatch(window -> window.contains(h.at())))
                .toList());
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

    /**
     * Last primary value per minute for the {@code minutes} minutes ending at {@code now}'s minute,
     * oldest first; minutes without a value (no answer) are null gaps.
     */
    public static List<Double> minuteSeries(List<Heartbeat> heartbeats, Instant now, int minutes) {
        Instant end = now.truncatedTo(ChronoUnit.MINUTES);
        Instant start = end.minus(minutes - 1L, ChronoUnit.MINUTES);
        Double[] buckets = new Double[minutes];
        for (Heartbeat h : heartbeats) {
            Instant minute = h.at().truncatedTo(ChronoUnit.MINUTES);
            if (h.value() == null || minute.isBefore(start) || minute.isAfter(end)) {
                continue;
            }
            buckets[(int) ChronoUnit.MINUTES.between(start, minute)] = h.value();
        }
        return Arrays.asList(buckets);
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
