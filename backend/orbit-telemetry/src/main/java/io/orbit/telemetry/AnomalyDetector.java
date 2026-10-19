package io.orbit.telemetry;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * BE-22: simple anomaly detection without ML: z-score of the current value against the values at the
 * same hour in the history available in memory (a full week only when the window allows it).
 */
public final class AnomalyDetector {

    /** @param baselineSamples how many historical values formed the baseline */
    public record Verdict(double zScore, double mean, double stdDev, int baselineSamples, boolean anomalous) {
    }

    private AnomalyDetector() {
    }

    /** z-score of {@code current}; empty with fewer than {@code minSamples} values or zero deviation. */
    public static Optional<Verdict> score(List<Double> baseline, double current, double threshold, int minSamples) {
        throw new UnsupportedOperationException("BE-22 anomaly detection is not implemented yet");
    }

    /** Values within {@code tolerance} of the same time of day as {@code at} on previous days. */
    public static List<Double> sameHourBaseline(List<Heartbeat> heartbeats, Instant at, Duration tolerance) {
        throw new UnsupportedOperationException("BE-22 anomaly detection is not implemented yet");
    }
}
