package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-19 in-memory rollups")
class RollupsTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");

    private static Heartbeat hb(MonitorState s, long latency, Double value, int second) {
        return new Heartbeat("m", s, latency, value, T0.plusSeconds(second));
    }

    @Test
    @DisplayName("one-minute buckets aggregate value, availability and latency")
    void minuteBuckets() {
        List<Rollups.Rollup> rollups = Rollups.of(List.of(
                hb(MonitorState.OK, 10, 100.0, 5),
                hb(MonitorState.DOWN, 0, 300.0, 35),
                hb(MonitorState.OK, 30, 200.0, 70)), Duration.ofMinutes(1));

        assertThat(rollups).hasSize(2);
        Rollups.Rollup first = rollups.getFirst();
        assertThat(first.start()).isEqualTo(T0);
        assertThat(first.count()).isEqualTo(2);
        assertThat(first.min()).isEqualTo(100.0);
        assertThat(first.max()).isEqualTo(300.0);
        assertThat(first.avg()).isEqualTo(200.0);
        assertThat(first.upRatio()).isEqualTo(0.5);
        assertThat(rollups.get(1).start()).isEqualTo(T0.plusSeconds(60));
    }

    @Test
    @DisplayName("hour buckets and missing values")
    void hourBuckets() {
        List<Rollups.Rollup> rollups = Rollups.of(List.of(hb(MonitorState.OK, 10, null, 5),
                hb(MonitorState.OK, 20, null, 3_000)), Duration.ofHours(1));
        assertThat(rollups).singleElement().satisfies(r -> {
            assertThat(r.count()).isEqualTo(2);
            assertThat(r.avg()).isNull();
            assertThat(r.p95Latency()).isEqualTo(20);
        });
    }

    @Test
    @DisplayName("nothing in, nothing out")
    void empty() {
        assertThat(Rollups.of(List.of(), Duration.ofMinutes(1))).isEmpty();
    }
}
