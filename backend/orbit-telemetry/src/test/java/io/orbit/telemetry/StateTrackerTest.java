package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class StateTrackerTest {

    private static final Instant T0 = Instant.parse("2026-10-18T00:00:00Z");
    private final StateTracker tracker = new StateTracker();

    private Optional<MonitorStateChanged> observe(MonitorState state, int downAfter, int second) {
        return tracker.observe("m", state, downAfter, T0.plusSeconds(second));
    }

    @Test
    void firstResultLeavesUnknown() {
        assertThat(tracker.current("m")).isEqualTo(MonitorState.UNKNOWN);
        MonitorStateChanged change = observe(MonitorState.OK, 1, 0).orElseThrow();

        assertThat(change.previous()).isEqualTo(MonitorState.UNKNOWN);
        assertThat(change.current()).isEqualTo(MonitorState.OK);
        assertThat(change.at()).isEqualTo(T0);
        assertThat(tracker.current("m")).isEqualTo(MonitorState.OK);
    }

    @Test
    void sameStateEmitsNothing() {
        observe(MonitorState.OK, 1, 0);
        assertThat(observe(MonitorState.OK, 1, 1)).isEmpty();
    }

    @Test
    void downNeedsConsecutiveFailures() {
        observe(MonitorState.OK, 3, 0);

        assertThat(observe(MonitorState.DOWN, 3, 1)).isEmpty();
        assertThat(observe(MonitorState.DOWN, 3, 2)).isEmpty();
        assertThat(tracker.current("m")).isEqualTo(MonitorState.OK);
        MonitorStateChanged change = observe(MonitorState.DOWN, 3, 3).orElseThrow();
        assertThat(change.current()).isEqualTo(MonitorState.DOWN);
        assertThat(change.since()).isEqualTo(T0.plusSeconds(1));
    }

    @Test
    void aSuccessResetsTheFailureCount() {
        observe(MonitorState.OK, 2, 0);
        observe(MonitorState.DOWN, 2, 1);
        observe(MonitorState.OK, 2, 2);
        assertThat(observe(MonitorState.DOWN, 2, 3)).isEmpty();
    }

    @Test
    void warnAndRecoveryAreImmediate() {
        observe(MonitorState.OK, 3, 0);
        assertThat(observe(MonitorState.WARN, 3, 1)).map(MonitorStateChanged::current).contains(MonitorState.WARN);
        assertThat(observe(MonitorState.OK, 3, 2)).map(MonitorStateChanged::current).contains(MonitorState.OK);
    }

    @Test
    void sinceTracksWhenTheCurrentStateStarted() {
        observe(MonitorState.WARN, 1, 0);
        observe(MonitorState.WARN, 1, 30);
        assertThat(tracker.since("m")).contains(T0);
    }

    @Test
    void forgetResetsTheMonitor() {
        observe(MonitorState.DOWN, 1, 0);
        tracker.forget("m");
        assertThat(tracker.current("m")).isEqualTo(MonitorState.UNKNOWN);
    }
}
