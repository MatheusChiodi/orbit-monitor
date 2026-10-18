package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class HeartbeatStoreTest {

    private static final Instant T0 = Instant.parse("2026-10-18T00:00:00Z");

    private static Heartbeat hb(String id, MonitorState state, long latency, Instant at) {
        return new Heartbeat(id, state, latency, at);
    }

    @Test
    void keepsHeartbeatsInOrderPerMonitor() {
        var store = new HeartbeatStore(Duration.ofHours(24), 1_000);
        store.record(hb("a", MonitorState.OK, 10, T0));
        store.record(hb("b", MonitorState.DOWN, 0, T0));
        store.record(hb("a", MonitorState.WARN, 20, T0.plusSeconds(60)));

        assertThat(store.history("a")).extracting(Heartbeat::latencyMs).containsExactly(10L, 20L);
        assertThat(store.latest("a")).map(Heartbeat::state).contains(MonitorState.WARN);
        assertThat(store.latest("missing")).isEmpty();
        assertThat(store.monitorIds()).containsExactlyInAnyOrder("a", "b");
    }

    @Test
    void dropsHeartbeatsOlderThanTheWindow() {
        var store = new HeartbeatStore(Duration.ofHours(1), 1_000);
        store.record(hb("a", MonitorState.OK, 1, T0));
        store.record(hb("a", MonitorState.OK, 2, T0.plus(Duration.ofMinutes(30))));
        store.record(hb("a", MonitorState.OK, 3, T0.plus(Duration.ofMinutes(90))));

        assertThat(store.history("a")).extracting(Heartbeat::latencyMs).containsExactly(2L, 3L);
        assertThat(store.coverageStart("a")).contains(T0.plus(Duration.ofMinutes(30)));
    }

    @Test
    void capsTheNumberOfHeartbeatsPerMonitor() {
        var store = new HeartbeatStore(Duration.ofHours(24), 3);
        for (int i = 0; i < 5; i++) {
            store.record(hb("a", MonitorState.OK, i, T0.plusSeconds(i)));
        }
        assertThat(store.history("a")).extracting(Heartbeat::latencyMs).containsExactly(2L, 3L, 4L);
    }

    @Test
    void historySinceFiltersByTime() {
        var store = new HeartbeatStore(Duration.ofHours(24), 100);
        store.record(hb("a", MonitorState.OK, 1, T0));
        store.record(hb("a", MonitorState.OK, 2, T0.plusSeconds(600)));

        assertThat(store.history("a", T0.plusSeconds(300))).extracting(Heartbeat::latencyMs).containsExactly(2L);
    }

    @Test
    void forgetRemovesAMonitor() {
        var store = new HeartbeatStore(Duration.ofHours(24), 100);
        store.record(hb("a", MonitorState.OK, 1, T0));
        store.forget("a");
        assertThat(store.history("a")).isEmpty();
    }
}
