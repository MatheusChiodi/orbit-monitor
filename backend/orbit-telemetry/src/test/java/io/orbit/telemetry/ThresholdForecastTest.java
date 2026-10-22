package io.orbit.telemetry;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-24 time to threshold")
class ThresholdForecastTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");

    private static ThresholdForecast.Point p(int minute, double v) {
        return new ThresholdForecast.Point(T0.plus(Duration.ofMinutes(minute)), v);
    }

    @Test
    @DisplayName("a rising queue crosses its limit at the extrapolated time")
    void rising() {
        // +10 per minute from 100: reaches 200 at minute 10
        var points = List.of(p(0, 100), p(1, 110), p(2, 120), p(3, 130));
        assertThat(ThresholdForecast.timeToCross(points, 200)).contains(T0.plus(Duration.ofMinutes(10)));
    }

    @Test
    @DisplayName("a falling or flat series never crosses an upper limit")
    void movingAway() {
        assertThat(ThresholdForecast.timeToCross(List.of(p(0, 150), p(1, 140), p(2, 130)), 200)).isEmpty();
        assertThat(ThresholdForecast.timeToCross(List.of(p(0, 150), p(1, 150), p(2, 150)), 200)).isEmpty();
    }

    @Test
    @DisplayName("too few points give no forecast")
    void fewPoints() {
        assertThat(ThresholdForecast.timeToCross(List.of(p(0, 1), p(1, 2)), 10)).isEmpty();
    }
}
