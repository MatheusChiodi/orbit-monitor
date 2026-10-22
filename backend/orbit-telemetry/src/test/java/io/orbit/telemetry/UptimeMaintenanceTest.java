package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-20 uptime excludes maintenance windows and states its coverage")
class UptimeMaintenanceTest {

    private static final Instant T0 = Instant.parse("2026-10-18T02:00:00Z");

    private static Heartbeat hb(MonitorState s, int minute) {
        return new Heartbeat("m", s, 5, T0.plusSeconds(minute * 60L));
    }

    @Test
    @DisplayName("checks during maintenance do not count")
    void excludesMaintenance() {
        List<Heartbeat> beats = List.of(hb(MonitorState.OK, 0), hb(MonitorState.DOWN, 10), hb(MonitorState.DOWN, 20),
                hb(MonitorState.OK, 40));
        TimeRange maintenance = new TimeRange(T0.plusSeconds(5 * 60), T0.plusSeconds(30 * 60));

        UptimeReport report = Statistics.uptime(beats, List.of(maintenance));

        assertThat(report.ratio()).isEqualTo(1.0);
        assertThat(report.samples()).isEqualTo(2);
        assertThat(report.coverageFrom()).isEqualTo(T0);
    }

    @Test
    @DisplayName("without windows it equals the plain uptime")
    void noWindows() {
        List<Heartbeat> beats = List.of(hb(MonitorState.OK, 0), hb(MonitorState.DOWN, 10));
        assertThat(Statistics.uptime(beats, List.of())).isEqualTo(Statistics.uptime(beats));
    }
}
