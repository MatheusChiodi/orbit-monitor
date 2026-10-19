package io.orbit.history.bench;

import io.orbit.common.MonitorState;
import io.orbit.history.HistorySample;
import io.orbit.history.HistorySettings;
import io.orbit.history.HistorySummary;
import io.orbit.history.codec.Compression;
import io.orbit.history.store.HistoryStore;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Map;
import java.util.Random;
import java.util.TreeMap;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * docs/08 section 8: 30 days of synthetic data at the reference load (200 monitors, one check every
 * 30 s), then size, write throughput, query latency and crash-loss assertions. Run with
 * {@code ./mvnw -Pbench verify}; numbers are printed for the feature context file.
 */
@Tag("bench")
class HistoryBenchmarkTest {

    private static final int MONITORS = 200;
    private static final int STEP_MS = 30_000;
    private static final int DAYS = 30;
    private static final long MB = 1024 * 1024;
    private static final Instant END = Instant.parse("2026-10-18T12:00:00Z");

    @TempDir
    Path dir;

    @Test
    void thirtyDaysAtTheReferenceLoadFitTheBudgets() throws Exception {
        MutableClock clock = new MutableClock(END.minus(Duration.ofDays(DAYS - 1)));
        Instant start = clock.instant();
        Random random = new Random(42);
        Generator gen = new Generator(random);
        long records = 0;
        long maxOfferNanos = 0;
        long[] offerSamples = new long[1 << 16];
        int sampled = 0;

        long t0 = System.nanoTime();
        try (HistoryStore store = HistoryStore.open(HistorySettings.defaults(dir), clock, () -> Long.MAX_VALUE)) {
            for (Instant tick = start; tick.isBefore(END); tick = tick.plusMillis(STEP_MS)) {
                clock.set(tick);
                for (int m = 0; m < MONITORS; m++) {
                    HistorySample sample = gen.sample(m, tick);
                    long before = System.nanoTime();
                    boolean accepted = store.record(sample);
                    long took = System.nanoTime() - before;
                    maxOfferNanos = Math.max(maxOfferNanos, took);
                    if ((records & 255) == 0 && sampled < offerSamples.length) {
                        offerSamples[sampled++] = took;
                    }
                    assertThat(accepted).isTrue();
                    records++;
                }
                if (records % (MONITORS * 120L * 4) == 0) {
                    store.flush().join(); // keep the queue bounded: one sync point every 4 hours of data
                }
            }
            store.flush().join();
        }
        double writeSeconds = (System.nanoTime() - t0) / 1e9;
        double perSecond = records / writeSeconds;

        Map<String, Long> sizes = sizes(dir);
        long total = sizes.values().stream().mapToLong(Long::longValue).sum();

        // Queries on a freshly opened store (cold caches).
        long summaryCold;
        long summaryWarm;
        long rawDayCold;
        long rawDayWarm;
        HistorySummary summary;
        int rawCount;
        clock.set(END);
        try (HistoryStore store = HistoryStore.open(HistorySettings.defaults(dir), clock, () -> Long.MAX_VALUE)) {
            long q = System.nanoTime();
            summary = store.summary("monitor-17", END.minus(Duration.ofDays(DAYS)), END);
            summaryCold = (System.nanoTime() - q) / 1_000_000;
            q = System.nanoTime();
            store.summary("monitor-18", END.minus(Duration.ofDays(DAYS)), END);
            summaryWarm = (System.nanoTime() - q) / 1_000_000;
            q = System.nanoTime();
            rawCount = store.raw("monitor-17", END.minus(Duration.ofHours(24)), END).size();
            rawDayCold = (System.nanoTime() - q) / 1_000_000;
            q = System.nanoTime();
            store.raw("monitor-18", END.minus(Duration.ofHours(24)), END);
            rawDayWarm = (System.nanoTime() - q) / 1_000_000;
        }

        Arrays.sort(offerSamples, 0, sampled);
        long offerP999 = sampled == 0 ? 0 : offerSamples[(int) (sampled * 0.999)];
        System.out.printf("""
                        [history bench] codec=%s records=%,d over %d days, %d monitors @%ds
                        [history bench] size total=%.1f MB (%.2f B/record) breakdown=%s
                        [history bench] write %.0f records/s (%.1f s, writer thread, incl. hourly compression + rollups)
                        [history bench] probe enqueue p99.9=%d µs max=%d µs
                        [history bench] 30-day summary cold=%d ms warm=%d ms (samples=%d uptime=%.3f%% p95=%d ms)
                        [history bench] 24-hour raw query cold=%d ms warm=%d ms (%d records)
                        """, Compression.preferred(), records, DAYS, MONITORS, STEP_MS / 1000, total / (double) MB,
                (double) total / records, human(sizes), perSecond, writeSeconds, offerP999 / 1000,
                maxOfferNanos / 1000, summaryCold, summaryWarm, summary.samples(), summary.uptimePercent(),
                summary.p95(), rawDayCold, rawDayWarm, rawCount);

        assertThat(total).as("30 days on disk").isLessThan(150 * MB);
        assertThat(perSecond).as("records/s on the writer thread").isGreaterThanOrEqualTo(50_000);
        assertThat(summary.samples()).isGreaterThan(80_000);
        assertThat(summaryCold).as("30-day uptime + p95").isLessThan(200);
        assertThat(rawCount).isEqualTo(24 * 120);
        assertThat(rawDayCold).as("24-hour raw chart").isLessThan(100);
    }

    @Test
    void aCrashMidWriteLosesAtMostTheLastFlushWindow() throws Exception {
        Clock clock = Clock.systemUTC();
        Path live = dir.resolve("live");
        Path crashed = dir.resolve("crashed");
        Generator gen = new Generator(new Random(5));
        long snapshotAt;
        long recordedBeforeWindow = 0;
        try (HistoryStore store = HistoryStore.open(HistorySettings.defaults(live), clock, () -> Long.MAX_VALUE)) {
            long until = System.currentTimeMillis() + 3_000;
            long[] times = new long[2_000_000];
            int i = 0;
            while (System.currentTimeMillis() < until && i < times.length) {
                HistorySample sample = gen.sample(i % MONITORS, Instant.ofEpochMilli(System.currentTimeMillis()));
                store.record(sample);
                times[i++] = sample.at().toEpochMilli();
                if (i % 1_000 == 0) {
                    Thread.sleep(5); // roughly 100k records/s offered, spread over the whole window
                }
            }
            // Copy the files as a killed process would leave them: no orderly close, maybe torn tails.
            snapshotAt = System.currentTimeMillis();
            copyTree(live, crashed);
            for (int k = 0; k < i; k++) {
                if (times[k] < snapshotAt - 1_200) {
                    recordedBeforeWindow++;
                }
            }
        }
        long survived = 0;
        try (HistoryStore store = HistoryStore.open(HistorySettings.defaults(crashed), clock,
                () -> Long.MAX_VALUE)) {
            for (int m = 0; m < MONITORS; m++) {
                survived += store.raw("monitor-" + m, Instant.EPOCH, Instant.ofEpochMilli(snapshotAt - 1_200))
                        .size();
            }
        }
        System.out.printf("[history bench] crash: %,d records recorded > 1.2 s before the crash, %,d survived%n",
                recordedBeforeWindow, survived);
        assertThat(survived).isEqualTo(recordedBeforeWindow);
    }

    /** Realistic-looking checks: steady latency with noise, rare failures, half with a slow-moving value. */
    private static final class Generator {
        private final Random random;
        private final double[] failureRate = new double[MONITORS];
        private final int[] baseLatency = new int[MONITORS];
        private final long[] value = new long[MONITORS];

        Generator(Random random) {
            this.random = random;
            for (int m = 0; m < MONITORS; m++) {
                failureRate[m] = m % 25 == 0 ? 0.02 : 0.001;
                baseLatency[m] = 40 + random.nextInt(400);
                value[m] = 1_000 + random.nextInt(10_000);
            }
        }

        HistorySample sample(int m, Instant at) {
            boolean down = random.nextDouble() < failureRate[m];
            boolean warn = !down && random.nextDouble() < 0.01;
            long latency = down ? 10_000 : Math.max(1, baseLatency[m] + (long) (random.nextGaussian() * 15));
            Double v = null;
            if (m % 2 == 1) {
                value[m] += random.nextInt(5) - 2;
                v = (double) value[m];
            }
            Instant jittered = at.plusMillis(random.nextInt(20));
            return new HistorySample("monitor-" + m, jittered,
                    down ? MonitorState.DOWN : warn ? MonitorState.WARN : MonitorState.OK, latency, v,
                    down ? "TIMEOUT" : null);
        }
    }

    private static Map<String, Long> sizes(Path root) throws IOException {
        Map<String, Long> sizes = new TreeMap<>();
        try (Stream<Path> files = Files.walk(root)) {
            for (Path p : files.filter(Files::isRegularFile).toList()) {
                Path rel = root.relativize(p);
                String group = rel.getNameCount() > 2 && rel.getName(0).toString().equals("rollups")
                        ? "rollups/" + rel.getName(2) : rel.getName(0).toString();
                sizes.merge(group, Files.size(p), Long::sum);
            }
        }
        return sizes;
    }

    private static String human(Map<String, Long> sizes) {
        StringBuilder out = new StringBuilder();
        sizes.forEach((k, v) -> out.append(k).append('=').append(String.format("%.1fMB ", v / (double) MB)));
        return out.toString().trim();
    }

    private static void copyTree(Path from, Path to) throws IOException {
        try (Stream<Path> files = Files.walk(from)) {
            for (Path p : files.sorted(Comparator.comparingInt(Path::getNameCount)).toList()) {
                Path target = to.resolve(from.relativize(p).toString());
                if (Files.isDirectory(p)) {
                    Files.createDirectories(target);
                } else {
                    try {
                        Files.copy(p, target);
                    } catch (IOException ignored) {
                        // A file deleted mid-copy (hour closed meanwhile) is simply absent after the crash.
                    }
                }
            }
        }
    }

    private static final class MutableClock extends Clock {
        private volatile Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void set(Instant instant) {
            now = instant;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
