package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MinuteSeriesTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:30Z");

    private static Heartbeat value(double v, Instant at) {
        return new Heartbeat("m", MonitorState.OK, 5, v, at);
    }

    @Test
    void lastValuePerMinuteWithNullGaps() {
        List<Heartbeat> beats = List.of(
                value(10, NOW.minusSeconds(150)),
                value(11, NOW.minusSeconds(140)),
                value(20, NOW.minusSeconds(20)));

        List<Double> series = Statistics.minuteSeries(beats, NOW, 4);

        assertThat(series).containsExactly(null, 11.0, null, 20.0);
    }

    @Test
    void downChecksAreGapsAndOldBeatsAreIgnored() {
        List<Heartbeat> beats = List.of(
                value(1, NOW.minusSeconds(3_600)),
                new Heartbeat("m", MonitorState.DOWN, 0, null, NOW.minusSeconds(10)));

        assertThat(Statistics.minuteSeries(beats, NOW, 2)).containsExactly(null, null);
    }

    @Test
    void fourArgumentHeartbeatHasNoValue() {
        assertThat(new Heartbeat("m", MonitorState.OK, 5, NOW).value()).isNull();
    }
}
