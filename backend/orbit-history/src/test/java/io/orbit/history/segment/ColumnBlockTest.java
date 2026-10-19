package io.orbit.history.segment;

import io.orbit.history.codec.Compression;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import static org.assertj.core.api.Assertions.assertThat;

class ColumnBlockTest {

    private static final long T0 = 1_760_796_000_000L;

    @Test
    void encodesByKeyColumnByColumnAndDecodesOneKeyFromItsOffset() {
        List<Row> rows = new ArrayList<>();
        rows.add(new Row(2, T0 + 30_000, Row.OK, 100, 5, 0));
        rows.add(new Row(1, T0, Row.DOWN, 2_000, Double.NaN, 4));
        rows.add(new Row(2, T0, Row.WARN, 300, 7.25, 0));
        rows.add(new Row(1, T0 + 30_001, Row.OK, 90, Double.NaN, 0));

        ColumnBlock.Encoded block = ColumnBlock.encode(rows);

        assertThat(block.entries()).extracting(SegmentIndex.Entry::key).containsExactly(1, 2);
        SegmentIndex.Entry two = block.entries().get(1);
        assertThat(two.count()).isEqualTo(2);
        assertThat(two.minTime()).isEqualTo(T0);
        assertThat(two.maxTime()).isEqualTo(T0 + 30_000);
        assertThat(two.latencyMin()).isEqualTo(100);
        assertThat(two.latencyMax()).isEqualTo(300);
        assertThat(two.latencySum()).isEqualTo(400);
        assertThat(two.valueMin()).isEqualTo(5);
        assertThat(two.valueMax()).isEqualTo(7.25);
        assertThat(two.stateCounts()).containsExactly(1, 0, 1, 0);

        assertThat(ColumnBlock.decode(block.raw(), two)).containsExactly(
                new Row(2, T0, Row.WARN, 300, 7.25, 0),
                new Row(2, T0 + 30_000, Row.OK, 100, 5, 0));
        assertThat(ColumnBlock.decode(block.raw(), block.entries().getFirst())).containsExactly(
                new Row(1, T0, Row.DOWN, 2_000, Double.NaN, 4),
                new Row(1, T0 + 30_001, Row.OK, 90, Double.NaN, 0));
    }

    @Test
    void anHourOfRegularChecksCompressesToAFewBytesPerRecord() {
        Random random = new Random(7);
        List<Row> rows = new ArrayList<>();
        for (int key = 0; key < 200; key++) {
            for (int i = 0; i < 120; i++) {
                rows.add(new Row(key, T0 + i * 30_000L + random.nextInt(15), Row.OK, 80 + random.nextInt(60),
                        key % 2 == 0 ? Double.NaN : 1_000 + i / 10, 0));
            }
        }

        ColumnBlock.Encoded block = ColumnBlock.encode(rows);
        byte[] packed = Compression.ZSTD.compress(block.raw());

        double bytesPerRecord = (double) packed.length / rows.size();
        assertThat(bytesPerRecord).isLessThan(3.0);
    }
}
