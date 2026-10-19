package io.orbit.history.segment;

import io.orbit.history.codec.ByteSink;
import org.junit.jupiter.api.Test;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RowCodecTest {

    private static final long T0 = 1_760_796_000_000L;

    @Test
    void rowsRoundTripAcrossFramesWithPerKeyDeltas() {
        List<Row> rows = List.of(
                new Row(0, T0, Row.OK, 120, Double.NaN, 0),
                new Row(1, T0 + 5, Row.DOWN, 3_000, 42, 3),
                new Row(0, T0 + 30_000, Row.WARN, 450, 1.5, 0),
                new Row(1, T0 + 30_007, Row.OK, 80, 42, 0),
                new Row(1, T0 + 60_001, Row.OK, 81, 40, 0));

        RowCodec writer = new RowCodec();
        ByteSink a = new ByteSink(64);
        ByteSink b = new ByteSink(64);
        writer.encode(rows.subList(0, 2), a);
        writer.encode(rows.subList(2, 5), b);

        RowCodec reader = new RowCodec();
        List<Row> back = new ArrayList<>();
        reader.decode(a.toBuffer(), back::add);
        reader.decode(b.toBuffer(), back::add);

        assertThat(back).containsExactlyElementsOf(rows);
    }

    @Test
    void steadyHeartbeatCostsAboutEightBytes() {
        RowCodec codec = new RowCodec();
        ByteSink warmup = new ByteSink(64);
        codec.encode(List.of(new Row(7, T0, Row.OK, 118, Double.NaN, 0)), warmup);

        ByteSink sink = new ByteSink(64);
        codec.encode(List.of(new Row(7, T0 + 30_000, Row.OK, 131, Double.NaN, 0)), sink);

        assertThat(sink.size()).isBetween(6, 9);
        ByteBuffer in = sink.toBuffer();
        assertThat(in.remaining()).isEqualTo(sink.size());
    }
}
