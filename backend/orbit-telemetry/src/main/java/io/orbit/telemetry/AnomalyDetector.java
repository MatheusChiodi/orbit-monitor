package io.orbit.telemetry;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * BE-22: simple anomaly detection without ML: z-score of the current value against the values at the
 * same hour in the history available in memory (a full week only when the window allows it).
 */
public final class AnomalyDetector {

    private static final long DAY_MILLIS = Duration.ofDays(1).toMillis();

    /** @param baselineSamples how many historical values formed the baseline */
    public record Verdict(double zScore, double mean, double stdDev, int baselineSamples, boolean anomalous) {
    }

    private AnomalyDetector() {
    }

    /** z-score of {@code current}; empty with fewer than {@code minSamples} values or zero deviation. */
    public static Optional<Verdict> score(List<Double> baseline, double current, double threshold, int minSamples) {
        if (baseline.size() < Math.max(minSamples, 2) || Double.isNaN(current)) {
            return Optional.empty();
        }
        double mean = baseline.stream().mapToDouble(Double::doubleValue).average().orElse(Double.NaN);
        double variance = baseline.stream().mapToDouble(v -> (v - mean) * (v - mean)).sum() / baseline.size();
        double stdDev = Math.sqrt(variance);
        if (!(stdDev > 0)) {
            return Optional.empty();
        }
        double z = (current - mean) / stdDev;
        return Optional.of(new Verdict(z, mean, stdDev, baseline.size(), Math.abs(z) >= threshold));
    }

    /** Values within {@code tolerance} of the same time of day as {@code at} on previous days. */
    public static List<Double> sameHourBaseline(List<Heartbeat> heartbeats, Instant at, Duration tolerance) {
        long toleranceMillis = tolerance.toMillis();
        List<Double> values = new ArrayList<>();
        for (Heartbeat h : heartbeats) {
            if (h.value() == null || Double.isNaN(h.value()) || !h.at().isBefore(at)) {
                continue;
            }
            long ago = Duration.between(h.at(), at).toMillis();
            long days = Math.round((double) ago / DAY_MILLIS);
            if (days >= 1 && Math.abs(ago - days * DAY_MILLIS) <= toleranceMillis) {
                values.add(h.value());
            }
        }
        return values;
    }
}
