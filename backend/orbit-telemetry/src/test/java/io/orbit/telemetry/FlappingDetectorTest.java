package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-25 flapping detection")
class FlappingDetectorTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final FlappingDetector detector = new FlappingDetector(4, Duration.ofMinutes(10));

    private boolean change(String id, MonitorState to, int minute) {
        Instant at = T0.plus(Duration.ofMinutes(minute));
        return detector.observe(new MonitorStateChanged(id, MonitorState.OK, to, at, at));
    }

    @Test
    @DisplayName("four changes in ten minutes is flapping")
    void flapping() {
        assertThat(change("m", MonitorState.DOWN, 0)).isFalse();
        assertThat(change("m", MonitorState.OK, 2)).isFalse();
        assertThat(change("m", MonitorState.DOWN, 4)).isFalse();
        assertThat(change("m", MonitorState.OK, 6)).isTrue();
        assertThat(detector.isFlapping("m", T0.plus(Duration.ofMinutes(7)))).isTrue();
        assertThat(detector.isFlapping("other", T0)).isFalse();
    }

    @Test
    @DisplayName("changes spread over time are not flapping, and it calms down")
    void spread() {
        change("m", MonitorState.DOWN, 0);
        change("m", MonitorState.OK, 5);
        change("m", MonitorState.DOWN, 11);
        assertThat(change("m", MonitorState.OK, 17)).isFalse();

        change("x", MonitorState.DOWN, 0);
        change("x", MonitorState.OK, 1);
        change("x", MonitorState.DOWN, 2);
        change("x", MonitorState.OK, 3);
        assertThat(detector.isFlapping("x", T0.plus(Duration.ofMinutes(30)))).isFalse();
    }
}
