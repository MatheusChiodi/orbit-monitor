package io.orbit.telemetry;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** BE-24: linear regression over recent values forecasts when a series will cross its threshold. */
public final class ThresholdForecast {

    public record Point(Instant at, double value) {
    }

    private ThresholdForecast() {
    }

    /**
     * When the fitted line reaches {@code threshold}; empty when the trend moves away from it, is flat,
     * or there are fewer than three points. A series already past the threshold returns its last time.
     */
    public static Optional<Instant> timeToCross(List<Point> points, double threshold) {
        throw new UnsupportedOperationException("BE-24 time to threshold is not implemented yet");
    }
}
