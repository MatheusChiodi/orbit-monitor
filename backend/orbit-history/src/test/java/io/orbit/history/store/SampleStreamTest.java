package io.orbit.history.store;

import io.orbit.history.codec.Compression;
import io.orbit.history.rollup.Resolution;
import io.orbit.history.rollup.Rollup;
import io.orbit.history.segment.Row;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SampleStreamTest {

    private static final long H0 = 1_760_796_000_000L; // 2025-10-18T14:00Z
    private static final long HOUR = HistoryLayout.HOUR;

    @TempDir
    Path dir;

    private final List<String> warnings = new ArrayList<>();

    private SampleStream open(long now) throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        return SampleStream.open(layout, "heartbeats", Compression.preferred(), now, warnings::add);
    }

    private static List<Row> checks(int key, long from, int n) {
        List<Row> rows = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            rows.add(new Row(key, from + i * 30_000L, i % 10 == 0 ? Row.DOWN : Row.OK, 100 + i, i, 0));
        }
        return rows;
    }

    @Test
    void anHourRollsOverIntoAClosedSegmentWithIndexAndRollups() throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        try (SampleStream stream = open(H0)) {
            stream.append(checks(1, H0, 120));
            stream.append(checks(1, H0 + HOUR, 2));

            assertThat(layout.segment("heartbeats", H0)).exists();
            assertThat(layout.index("heartbeats", H0)).exists();
            assertThat(layout.hot("heartbeats", H0)).doesNotExist();
            assertThat(layout.hot("heartbeats", H0 + HOUR)).exists();

            List<Row> all = stream.rows(1, H0, H0 + 2 * HOUR);
            assertThat(all).hasSize(122);
            assertThat(all).isSortedAccordingTo((a, b) -> Long.compare(a.at(), b.at()));
            assertThat(stream.rows(1, H0 + 30_000, H0 + 90_000)).extracting(Row::at)
                    .containsExactly(H0 + 30_000, H0 + 60_000);

            List<Rollup> hours = stream.rollups(Resolution.HOUR, 1, H0, H0 + HOUR);
            assertThat(hours).hasSize(1);
            assertThat(hours.getFirst().count()).isEqualTo(120);
            assertThat(hours.getFirst().stateCount(Row.DOWN)).isEqualTo(12);
            assertThat(stream.rollups(Resolution.MINUTE, 1, H0, H0 + HOUR)).hasSize(60);
        }
    }

    @Test
    void crashMidHourLosesNothingFlushedAndClosesTheHourOnNextStart() throws IOException {
        SampleStream crashed = open(H0);
        crashed.append(checks(3, H0, 50));
        crashed.abandon(); // simulated crash: no orderly close

        try (SampleStream restarted = open(H0 + 2 * HOUR)) {
            assertThat(new HistoryLayout(dir).segment("heartbeats", H0)).exists();
            assertThat(restarted.rows(3, H0, H0 + HOUR)).hasSize(50);
            assertThat(restarted.rollups(Resolution.HOUR, 3, H0, H0 + HOUR)).hasSize(1);
        }
    }

    @Test
    void restartWithinTheSameHourKeepsAppendingToTheHotSegment() throws IOException {
        SampleStream first = open(H0);
        first.append(checks(5, H0, 10));
        first.abandon();

        try (SampleStream second = open(H0 + 10 * 30_000L)) {
            second.append(checks(5, H0 + 10 * 30_000L, 10));
            assertThat(second.rows(5, H0, H0 + HOUR)).hasSize(20).extracting(Row::value)
                    .containsExactly(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0,
                            0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        }
        try (SampleStream third = open(H0 + 20 * 30_000L)) {
            assertThat(third.rows(5, H0, H0 + HOUR)).hasSize(20);
        }
    }

    @Test
    void tornTailAfterACrashIsTruncatedAndEarlierFlushesSurvive() throws IOException {
        SampleStream crashed = open(H0);
        crashed.append(checks(2, H0, 5));
        crashed.append(checks(2, H0 + 5 * 30_000L, 5));
        crashed.abandon();
        Path wal = new HistoryLayout(dir).hot("heartbeats", H0);
        try (FileChannel ch = FileChannel.open(wal, StandardOpenOption.WRITE)) {
            ch.truncate(Files.size(wal) - 2);
        }

        try (SampleStream restarted = open(H0 + 11 * 30_000L)) {
            assertThat(restarted.rows(2, H0, H0 + HOUR)).hasSize(5);
        }
    }

    @Test
    void damagedClosedSegmentIsQuarantinedAndSkipped() throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        try (SampleStream stream = open(H0)) {
            stream.append(checks(1, H0, 10));
            stream.append(checks(1, H0 + HOUR, 10));
        }
        Path seg = layout.segment("heartbeats", H0);
        byte[] bytes = Files.readAllBytes(seg);
        bytes[bytes.length - 6] ^= 0x5A;
        Files.write(seg, bytes);

        try (SampleStream stream = open(H0 + HOUR + 1)) {
            assertThat(stream.rows(1, H0, H0 + 2 * HOUR)).hasSize(10);
        }
        assertThat(seg.resolveSibling(seg.getFileName() + ".bad")).exists();
        assertThat(warnings).anyMatch(w -> w.contains("quarantined"));
    }

    @Test
    void withRawWritesDisabledOnlyRollupsReachTheDisk() throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        try (SampleStream stream = open(H0)) {
            stream.rawEnabled(false);
            stream.append(checks(1, H0, 10));
            assertThat(stream.rows(1, H0, H0 + HOUR)).as("current hour still served from memory").hasSize(10);
            stream.append(checks(1, H0 + HOUR, 1));

            assertThat(layout.segment("heartbeats", H0)).doesNotExist();
            assertThat(layout.hot("heartbeats", H0 + HOUR)).doesNotExist();
            assertThat(stream.rollups(Resolution.HOUR, 1, H0, H0 + HOUR)).hasSize(1);
        }
    }

    @Test
    void missingRollupsAreRebuiltFromRawSegmentsOnStart() throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        try (SampleStream stream = open(H0)) {
            stream.append(checks(1, H0, 30));
            stream.append(checks(1, H0 + HOUR, 1));
        }
        Files.delete(layout.rollups("heartbeats", Resolution.HOUR, H0));
        Files.delete(layout.rollups("heartbeats", Resolution.MINUTE, H0));

        try (SampleStream stream = open(H0 + HOUR + 5)) {
            assertThat(stream.rollups(Resolution.HOUR, 1, H0, H0 + HOUR)).singleElement()
                    .extracting(Rollup::count).isEqualTo(30L);
        }
    }

    @Test
    void lateRowsOfAClosedHourAreKeptWithoutRewritingTheClosedSegment() throws IOException {
        try (SampleStream stream = open(H0)) {
            stream.append(checks(1, H0, 10));
            stream.roll(H0 + HOUR + 1);
            stream.append(List.of(new Row(1, H0 + 50 * 30_000L, Row.OK, 1, Double.NaN, 0)));
            stream.roll(H0 + 2 * HOUR + 1);

            assertThat(stream.rows(1, H0, H0 + HOUR)).hasSize(11);
            assertThat(stream.rollups(Resolution.HOUR, 1, H0, H0 + HOUR)).singleElement()
                    .extracting(Rollup::count).isEqualTo(11L);
        }
        try (SampleStream reopened = open(H0 + 2 * HOUR + 5)) {
            assertThat(reopened.rows(1, H0, H0 + HOUR)).hasSize(11);
        }
    }

    @Test
    void closingAnHourWhoseSegmentExistsMergesInsteadOfOverwriting() throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        try (SampleStream stream = open(H0)) {
            stream.append(checks(1, H0, 5));
            stream.roll(H0 + HOUR + 1);
        }
        // A hot segment for the same hour reappears (e.g. clock moved backwards before a restart).
        try (SampleStream stream = open(H0 + 10)) {
            stream.append(List.of(new Row(1, H0 + 400_000, Row.OK, 1, Double.NaN, 0)));
        }
        try (SampleStream stream = open(H0 + HOUR + 5)) {
            assertThat(stream.rows(1, H0, H0 + HOUR)).hasSize(6);
        }
        assertThat(layout.hot("heartbeats", H0)).doesNotExist();
    }

    @Test
    void crashBetweenWritingTheSegmentAndDeletingTheHotFileDoesNotDuplicateRows() throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        Path wal = layout.hot("heartbeats", H0);
        Path copy = dir.resolve("wal.copy");
        try (SampleStream stream = open(H0)) {
            stream.append(checks(1, H0, 8));
            stream.force();
            Files.copy(wal, copy);
            stream.roll(H0 + HOUR + 1);
        }
        Files.copy(copy, wal);

        try (SampleStream stream = open(H0 + 2 * HOUR)) {
            assertThat(stream.rows(1, H0, H0 + HOUR)).hasSize(8);
            assertThat(stream.rollups(Resolution.HOUR, 1, H0, H0 + HOUR)).singleElement()
                    .extracting(Rollup::count).isEqualTo(8L);
        }
        assertThat(wal).doesNotExist();
    }

    @Test
    void timerRollClosesAnIdleHour() throws IOException {
        HistoryLayout layout = new HistoryLayout(dir);
        try (SampleStream stream = open(H0)) {
            stream.append(checks(1, H0, 3));
            stream.roll(H0 + HOUR + 1);

            assertThat(layout.segment("heartbeats", H0)).exists();
            assertThat(stream.rows(1, H0, H0 + HOUR)).hasSize(3);
        }
    }
}
