package io.orbit.telemetry;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** BE-24: linear regression over recent values forecasts when a series will cross its threshold. */
public final class ThresholdForecast {

    private static final int MIN_POINTS = 3;

    public record Point(Instant at, double value) {
    }

    private ThresholdForecast() {
    }

    /**
     * When the fitted line reaches {@code threshold}; empty when the trend moves away from it, is flat,
     * or there are fewer than three points. A series already past the threshold returns its last time.
     * The side of the limit comes from the first point: starting below it is an upper limit, above it a lower one.
     */
    public static Optional<Instant> timeToCross(List<Point> points, double threshold) {
        if (points.size() < MIN_POINTS) {
            return Optional.empty();
        }
        Instant origin = points.getFirst().at();
        int n = points.size();
        double sumX = 0;
        double sumY = 0;
        for (Point p : points) {
            sumX += seconds(origin, p.at());
            sumY += p.value();
        }
        double meanX = sumX / n;
        double meanY = sumY / n;
        double sxy = 0;
        double sxx = 0;
        for (Point p : points) {
            double dx = seconds(origin, p.at()) - meanX;
            sxy += dx * (p.value() - meanY);
            sxx += dx * dx;
        }
        if (sxx == 0) {
            return Optional.empty();
        }
        double slope = sxy / sxx;
        boolean upperLimit = points.getFirst().value() < threshold;
        if (slope == 0 || Double.isNaN(slope) || upperLimit != slope > 0) {
            return Optional.empty();
        }
        Point last = points.getLast();
        boolean alreadyPast = upperLimit ? last.value() >= threshold : last.value() <= threshold;
        if (alreadyPast) {
            return Optional.of(last.at());
        }
        double intercept = meanY - slope * meanX;
        double crossAtSeconds = (threshold - intercept) / slope;
        Instant when = origin.plusMillis(Math.round(crossAtSeconds * 1000));
        return Optional.of(when.isBefore(last.at()) ? last.at() : when);
    }

    private static double seconds(Instant origin, Instant at) {
        return (at.toEpochMilli() - origin.toEpochMilli()) / 1000.0;
    }
}
