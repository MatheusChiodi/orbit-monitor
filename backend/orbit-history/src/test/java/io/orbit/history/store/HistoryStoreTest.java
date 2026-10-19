package io.orbit.history.store;

import io.orbit.common.MonitorState;
import io.orbit.history.AuditRecord;
import io.orbit.history.HistoryBucket;
import io.orbit.history.HistoryEvent;
import io.orbit.history.HistorySample;
import io.orbit.history.HistorySettings;
import io.orbit.history.HistorySummary;
import io.orbit.history.rollup.Resolution;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class HistoryStoreTest {

    private static final Instant T0 = Instant.parse("2026-10-18T10:00:00Z");
    private static final long MB = 1024 * 1024;

    @TempDir
    Path dir;

    private final MutableClock clock = new MutableClock(T0);
    private final AtomicLong freeBytes = new AtomicLong(10_000 * MB);

    private HistoryStore open(HistorySettings settings) throws Exception {
        return HistoryStore.open(settings, clock, freeBytes::get);
    }

    private HistoryStore open() throws Exception {
        return open(HistorySettings.defaults(dir));
    }

    private static void checks(HistoryStore store, String key, Instant from, int n, long stepMs) {
        for (int i = 0; i < n; i++) {
            MonitorState state = i % 20 == 0 ? MonitorState.DOWN : MonitorState.OK;
            store.record(new HistorySample(key, from.plusMillis(i * stepMs), state, 100 + i % 50, (double) i,
                    state == MonitorState.DOWN ? "TIMEOUT" : null));
        }
    }

    @Test
    void recordedChecksAreReadBackRawAcrossHotAndClosedHours() throws Exception {
        try (HistoryStore store = open()) {
            checks(store, "api", T0, 240, 30_000); // two hours
            store.flush().join();
            clock.set(T0.plus(Duration.ofHours(2)).plusSeconds(1));
            store.record(new HistorySample("api", clock.instant(), MonitorState.OK, 90, null));
            store.flush().join();

            List<HistorySample> raw = store.raw("api", T0, T0.plus(Duration.ofHours(3)));
            assertThat(raw).hasSize(241);
            assertThat(raw.getFirst().state()).isEqualTo(MonitorState.DOWN);
            assertThat(raw.getFirst().error()).isEqualTo("TIMEOUT");
            assertThat(raw.get(1).value()).isEqualTo(1.0);
            assertThat(store.raw("unknown", T0, T0.plusSeconds(60))).isEmpty();
        }
    }

    @Test
    void bucketsAndSummaryComeFromRollupsAndPartialHoursFromRaw() throws Exception {
        try (HistoryStore store = open()) {
            checks(store, "db", T0, 360, 30_000); // three hours, 18 DOWN
            store.flush().join();
            clock.set(T0.plus(Duration.ofHours(3)).plusSeconds(5));
            store.record(new HistorySample("db", clock.instant(), MonitorState.OK, 100, null));
            store.flush().join();

            List<HistoryBucket> hours = store.buckets("db", T0, T0.plus(Duration.ofHours(3)), Resolution.HOUR);
            assertThat(hours).hasSize(3);
            assertThat(hours.getFirst().count()).isEqualTo(120);
            assertThat(hours.getFirst().down()).isEqualTo(6);
            assertThat(hours.getFirst().latencyP95()).isBetween(140L, 150L);
            assertThat(store.buckets("db", T0, T0.plus(Duration.ofHours(1)), Resolution.MINUTE)).hasSize(60);

            HistorySummary all = store.summary("db", T0.plusSeconds(15 * 60), T0.plus(Duration.ofHours(3)));
            assertThat(all.samples()).isEqualTo(330);
            assertThat(all.down()).isEqualTo(16);
            assertThat(all.uptimePercent()).isCloseTo(100.0 * 314 / 330, org.assertj.core.api.Assertions.within(0.01));
            assertThat(all.p95()).isBetween(140L, 150L);
        }
    }

    @Test
    void eventsAndAuditAreStoredRedactedAndFiltered() throws Exception {
        try (HistoryStore store = open()) {
            store.record(new HistoryEvent(T0, "incident.open", "api", null, "card 4111 1111 1111 1111 failed"));
            store.record(new HistoryEvent(T0.plusSeconds(1), "state.change", "db", null, "DOWN"));
            store.record(new AuditRecord(T0.plusSeconds(2), "Ana", "monitor.update", "monitor:api",
                    "password=hunter2"));
            store.flush().join();

            List<HistoryEvent> incidents = store.events(T0, T0.plusSeconds(10), "incident.open", null, 100);
            assertThat(incidents).singleElement().satisfies(e -> {
                assertThat(e.detail()).doesNotContain("4111 1111 1111 1111");
                assertThat(e.monitorId()).isEqualTo("api");
            });
            assertThat(store.events(T0, T0.plusSeconds(10), null, "db", 100)).hasSize(1);
            assertThat(store.audit(T0, T0.plusSeconds(10), "Ana", null, 100)).singleElement()
                    .satisfies(a -> assertThat(a.detail()).doesNotContain("hunter2"));
        }
    }

    @Test
    void daysOutsideTheRetentionWindowArePurgedOnStart() throws Exception {
        Instant old = T0.minus(Duration.ofDays(3));
        clock.set(old);
        try (HistoryStore store = open(new HistorySettings(dir, 2, 1024, 0))) {
            checks(store, "api", old, 4, 30_000);
            store.record(new HistoryEvent(old, "state.change", "api", null, null));
            store.flush().join();
        }
        clock.set(T0);
        try (HistoryStore store = open(new HistorySettings(dir, 2, 1024, 0))) {
            assertThat(store.raw("api", old, T0)).isEmpty();
            assertThat(store.events(old, T0, null, null, 10)).isEmpty();
            assertThat(dir.resolve("heartbeats").resolve("2026-10-15")).doesNotExist();
            assertThat(store.coverage().retentionDays()).isEqualTo(2);
        }
    }

    @Test
    void lowFreeDiskStopsRawWritesButKeepsRollups() throws Exception {
        freeBytes.set(100 * MB);
        try (HistoryStore store = open()) {
            checks(store, "api", T0, 10, 30_000);
            store.flush().join();
            clock.set(T0.plus(Duration.ofHours(1)).plusSeconds(1));
            store.record(new HistorySample("api", clock.instant(), MonitorState.OK, 1, null));
            store.flush().join();

            assertThat(store.health().rawWritesEnabled()).isFalse();
            assertThat(store.health().warnings()).anyMatch(w -> w.contains("minFreeDiskMb"));
            assertThat(Files.exists(dir.resolve("heartbeats/2026-10-18/10.seg"))).isFalse();
            assertThat(store.buckets("api", T0, T0.plus(Duration.ofHours(1)), Resolution.HOUR))
                    .singleElement().extracting(HistoryBucket::count).isEqualTo(10L);
            assertThat(store.coverage().rawWritesEnabled()).isFalse();
        }
    }

    @Test
    void coverageStartsAtTheOldestStoredDay() throws Exception {
        try (HistoryStore store = open()) {
            assertThat(store.coverage().oldest()).isNull();
            checks(store, "api", T0, 1, 30_000);
            store.flush().join();

            assertThat(store.coverage().oldest()).isEqualTo(Instant.parse("2026-10-18T00:00:00Z"));
            assertThat(store.coverage().retentionDays()).isEqualTo(30);
        }
    }

    /** Settable clock for deterministic hour and day boundaries. */
    static final class MutableClock extends Clock {
        private volatile Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void set(Instant instant) {
            now = instant;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
