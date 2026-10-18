package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TelemetryServiceTest {

    private static final Instant T0 = Instant.parse("2026-10-18T00:00:00Z");
    private final List<MonitorStateChanged> events = new ArrayList<>();
    private final TelemetryService service = new TelemetryService(
            new HeartbeatStore(Duration.ofHours(24), 1_000), new StateTracker(), events::add);

    private void record(MonitorState state, long latency, int second) {
        service.record(new Heartbeat("m", state, latency, T0.plusSeconds(second)), 2);
    }

    @Test
    void publishesConfirmedChangesOnly() {
        record(MonitorState.OK, 100, 0);
        record(MonitorState.DOWN, 0, 60);
        record(MonitorState.DOWN, 0, 120);
        record(MonitorState.DOWN, 0, 180);

        assertThat(events).extracting(MonitorStateChanged::current)
                .containsExactly(MonitorState.OK, MonitorState.DOWN);
        assertThat(events.getLast().since()).isEqualTo(T0.plusSeconds(60));
    }

    @Test
    void statusCombinesStateUptimeAndLatency() {
        record(MonitorState.OK, 100, 0);
        record(MonitorState.WARN, 300, 60);
        record(MonitorState.DOWN, 0, 120);
        record(MonitorState.OK, 200, 180);

        MonitorStatus status = service.status("m");

        assertThat(status.state()).isEqualTo(MonitorState.OK);
        assertThat(status.since()).isEqualTo(T0.plusSeconds(180));
        assertThat(status.uptime().ratio()).isEqualTo(0.75);
        assertThat(status.latency().p95()).isEqualTo(300L);
        assertThat(status.lastLatencyMs()).isEqualTo(200L);
        assertThat(status.lastCheckAt()).isEqualTo(T0.plusSeconds(180));
        assertThat(status.history()).hasSize(4);
    }

    @Test
    void unknownMonitorHasEmptyStatus() {
        MonitorStatus status = service.status("nope");
        assertThat(status.state()).isEqualTo(MonitorState.UNKNOWN);
        assertThat(status.lastCheckAt()).isNull();
        assertThat(status.uptime().samples()).isZero();
    }

    @Test
    void currentStateIsExposedForHysteresis() {
        record(MonitorState.WARN, 10, 0);
        assertThat(service.currentState("m")).isEqualTo(MonitorState.WARN);
    }

    @Test
    void forgetDropsEverything() {
        record(MonitorState.OK, 10, 0);
        service.forget("m");
        assertThat(service.status("m").history()).isEmpty();
        assertThat(service.currentState("m")).isEqualTo(MonitorState.UNKNOWN);
    }
}
