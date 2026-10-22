package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@DisplayName("BE-22 anomaly detection")
class AnomalyDetectorTest {

    @Test
    @DisplayName("a value far from the baseline is anomalous")
    void zScore() {
        List<Double> baseline = List.of(100.0, 102.0, 98.0, 101.0, 99.0, 100.0, 100.0);
        AnomalyDetector.Verdict v = AnomalyDetector.score(baseline, 150.0, 3.0, 5).orElseThrow();

        assertThat(v.mean()).isCloseTo(100.0, within(0.01));
        assertThat(v.zScore()).isGreaterThan(3.0);
        assertThat(v.anomalous()).isTrue();
        assertThat(AnomalyDetector.score(baseline, 101.0, 3.0, 5).orElseThrow().anomalous()).isFalse();
    }

    @Test
    @DisplayName("too little history or a flat baseline gives no verdict")
    void notEnoughData() {
        assertThat(AnomalyDetector.score(List.of(1.0, 2.0), 50.0, 3.0, 5)).isEmpty();
        assertThat(AnomalyDetector.score(List.of(5.0, 5.0, 5.0, 5.0, 5.0), 9.0, 3.0, 5)).isEmpty();
    }

    @Test
    @DisplayName("the baseline uses the same time of day on previous days")
    void sameHour() {
        Instant now = Instant.parse("2026-10-18T14:00:00Z");
        List<Heartbeat> beats = List.of(
                new Heartbeat("m", MonitorState.OK, 1, 10.0, now.minus(Duration.ofDays(1)).plusSeconds(60)),
                new Heartbeat("m", MonitorState.OK, 1, 99.0, now.minus(Duration.ofDays(1)).plus(Duration.ofHours(3))),
                new Heartbeat("m", MonitorState.OK, 1, 12.0, now.minus(Duration.ofDays(2)).minusSeconds(120)));

        assertThat(AnomalyDetector.sameHourBaseline(beats, now, Duration.ofMinutes(15))).containsExactlyInAnyOrder(10.0, 12.0);
    }
}
