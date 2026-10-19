package io.orbit.history.rollup;

import io.orbit.history.segment.Row;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class RollupTest {

    private static final long HOUR = 1_760_796_000_000L;

    @Test
    void aggregatesCountsStatesLatencyAndValues() {
        Rollup r = new Rollup(4, HOUR, true);
        r.add(new Row(4, HOUR, Row.OK, 100, 10, 0));
        r.add(new Row(4, HOUR + 1, Row.DOWN, 300, Double.NaN, 2));
        r.add(new Row(4, HOUR + 2, Row.WARN, 200, 20, 0));

        assertThat(r.count()).isEqualTo(3);
        assertThat(r.stateCount(Row.OK)).isEqualTo(1);
        assertThat(r.stateCount(Row.DOWN)).isEqualTo(1);
        assertThat(r.latencyCount()).as("DOWN checks do not count as latency").isEqualTo(2);
        assertThat(r.latencyMin()).isEqualTo(100);
        assertThat(r.latencyMax()).isEqualTo(200);
        assertThat(r.latencyMean()).isEqualTo(150);
        assertThat(r.latencyStdDev()).isCloseTo(50, within(0.01));
        assertThat(r.valueMean()).isEqualTo(15);
        assertThat(r.valueMin()).isEqualTo(10);
        assertThat(r.valueMax()).isEqualTo(20);
        assertThat(r.sketch()).isNotNull();
    }

    @Test
    void rollupBatchesRoundTripThroughTheCodec() {
        Rollup a = new Rollup(1, HOUR, false);
        a.add(new Row(1, HOUR, Row.OK, 50, Double.NaN, 0));
        Rollup b = new Rollup(2, HOUR + 60_000, true);
        b.add(new Row(2, HOUR + 60_000, Row.WARN, 70, 3.5, 0));
        b.add(new Row(2, HOUR + 61_000, Row.OK, 90, 4.5, 0));

        byte[] raw = RollupCodec.encode(Resolution.MINUTE, HOUR, List.of(a, b));
        List<Rollup> back = RollupCodec.decode(java.nio.ByteBuffer.wrap(raw));

        assertThat(back).hasSize(2);
        assertThat(back.get(0).key()).isEqualTo(1);
        assertThat(back.get(0).start()).isEqualTo(HOUR);
        assertThat(back.get(0).sketch()).isNull();
        assertThat(back.get(1).start()).isEqualTo(HOUR + 60_000);
        assertThat(back.get(1).count()).isEqualTo(2);
        assertThat(back.get(1).valueMean()).isEqualTo(4.0);
        assertThat(back.get(1).latencyStdDev()).isEqualTo(b.latencyStdDev());
        assertThat(back.get(1).sketch().quantile(0.5)).isEqualTo(b.sketch().quantile(0.5));
    }

    @Test
    void residualColumnsReconstructEveryAggregateExactly() {
        java.util.Random random = new java.util.Random(9);
        List<Rollup> input = new java.util.ArrayList<>();
        for (int key = 0; key < 40; key++) {
            Rollup r = new Rollup(key, HOUR + key % 3 * 60_000L, key % 2 == 0);
            int n = 1 + random.nextInt(120);
            for (int i = 0; i < n; i++) {
                int state = random.nextInt(4);
                double value = key % 5 == 0 ? Double.NaN : key % 5 == 1 ? random.nextGaussian() * 1e3
                        : random.nextInt(2_000_000) - 1_000_000;
                r.add(new Row(key, HOUR + i, state, random.nextInt(60_000), value, 0));
            }
            input.add(r);
        }

        List<Rollup> back = RollupCodec.decode(java.nio.ByteBuffer.wrap(
                RollupCodec.encode(Resolution.MINUTE, HOUR, input)));

        assertThat(back).hasSize(input.size());
        for (int i = 0; i < input.size(); i++) {
            Rollup a = input.get(i);
            Rollup b = back.get(i);
            assertThat(b.key()).isEqualTo(a.key());
            assertThat(b.start()).isEqualTo(a.start());
            assertThat(b.count()).isEqualTo(a.count());
            for (int s = 0; s < 4; s++) {
                assertThat(b.stateCount(s)).isEqualTo(a.stateCount(s));
            }
            assertThat(b.latencyCount()).isEqualTo(a.latencyCount());
            assertThat(b.latencyMin()).isEqualTo(a.latencyMin());
            assertThat(b.latencyMax()).isEqualTo(a.latencyMax());
            assertThat(b.latencySum()).isEqualTo(a.latencySum());
            assertThat(b.latencyStdDev()).isCloseTo(a.latencyStdDev(), within(1e-9));
            assertThat(b.valueCount()).isEqualTo(a.valueCount());
            assertThat(Double.compare(b.valueMin(), a.valueMin())).isZero();
            assertThat(Double.compare(b.valueMax(), a.valueMax())).isZero();
            assertThat(Double.compare(b.valueMean(), a.valueMean())).isZero();
        }
    }

    @Test
    void filteredDecodeSkipsOtherKeys() {
        Rollup a = new Rollup(1, HOUR, true);
        a.add(new Row(1, HOUR, Row.OK, 50, 9, 0));
        Rollup b = new Rollup(2, HOUR, true);
        b.add(new Row(2, HOUR, Row.OK, 70, Double.NaN, 0));
        Rollup c = new Rollup(1, HOUR + 3_600_000, false);
        c.add(new Row(1, HOUR + 3_600_000, Row.DOWN, 0, Double.NaN, 0));

        byte[] raw = RollupCodec.encode(Resolution.HOUR, HOUR, List.of(a, b, c));
        List<Rollup> back = RollupCodec.decode(java.nio.ByteBuffer.wrap(raw), key -> key == 1);

        assertThat(back).extracting(Rollup::start).containsExactly(HOUR, HOUR + 3_600_000);
        assertThat(back.get(1).stateCount(Row.DOWN)).isEqualTo(1);
    }

    @Test
    void mergingRollupsAddsTheirAggregates() {
        Rollup a = new Rollup(1, HOUR, true);
        a.add(new Row(1, HOUR, Row.OK, 10, Double.NaN, 0));
        Rollup b = new Rollup(1, HOUR + 3_600_000, true);
        b.add(new Row(1, HOUR + 3_600_000, Row.DOWN, 30, Double.NaN, 0));

        a.merge(b);

        assertThat(a.count()).isEqualTo(2);
        assertThat(a.stateCount(Row.DOWN)).isEqualTo(1);
        assertThat(a.latencyMax()).isEqualTo(10);
        assertThat(a.sketch().count()).isEqualTo(1);
    }
}
