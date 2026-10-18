package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class StatisticsTest {

    private static final Instant T0 = Instant.parse("2026-10-18T00:00:00Z");

    private static List<Heartbeat> beats(MonitorState... states) {
        List<Heartbeat> list = new ArrayList<>();
        for (int i = 0; i < states.length; i++) {
            list.add(new Heartbeat("m", states[i], 10L * (i + 1), T0.plusSeconds(i * 60L)));
        }
        return list;
    }

    @Test
    void uptimeCountsWarnAsUpAndIgnoresUnknown() {
        UptimeReport report = Statistics.uptime(beats(MonitorState.OK, MonitorState.WARN, MonitorState.DOWN,
                MonitorState.UNKNOWN, MonitorState.OK));

        assertThat(report.ratio()).isCloseTo(0.75, within(1e-9));
        assertThat(report.samples()).isEqualTo(4);
        assertThat(report.coverageFrom()).isEqualTo(T0);
        assertThat(report.percent()).isCloseTo(75.0, within(1e-9));
    }

    @Test
    void uptimeWithoutSamplesIsEmpty() {
        assertThat(Statistics.uptime(List.of()).samples()).isZero();
        assertThat(Statistics.uptime(List.of()).ratio()).isNaN();
        assertThat(Statistics.uptime(beats(MonitorState.UNKNOWN)).samples()).isZero();
    }

    @Test
    void percentilesUseNearestRank() {
        List<Long> latencies = LongStream.rangeClosed(1, 100).boxed().toList();

        assertThat(Statistics.percentile(latencies, 50)).isEqualTo(50L);
        assertThat(Statistics.percentile(latencies, 95)).isEqualTo(95L);
        assertThat(Statistics.percentile(latencies, 99)).isEqualTo(99L);
        assertThat(Statistics.percentile(latencies, 100)).isEqualTo(100L);
    }

    @Test
    void percentileIgnoresInputOrder() {
        assertThat(Statistics.percentile(List.of(900L, 100L, 300L, 200L), 50)).isEqualTo(200L);
        assertThat(Statistics.percentile(List.of(42L), 95)).isEqualTo(42L);
    }

    @Test
    void percentileOfNothingIsEmptyAndRangeIsChecked() {
        assertThat(Statistics.percentileOrNull(List.of(), 95)).isNull();
        assertThatThrownBy(() -> Statistics.percentile(List.of(1L), 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Statistics.percentile(List.of(1L), 101)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void latencySummaryIgnoresDownBeats() {
        LatencySummary s = Statistics.latency(beats(MonitorState.OK, MonitorState.DOWN, MonitorState.OK));
        assertThat(s.p50()).isEqualTo(10L);
        assertThat(s.p95()).isEqualTo(30L);
        assertThat(s.samples()).isEqualTo(2);
    }
}
