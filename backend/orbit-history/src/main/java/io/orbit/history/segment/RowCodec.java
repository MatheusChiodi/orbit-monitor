package io.orbit.history.segment;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.CorruptDataException;
import io.orbit.history.codec.Varint;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

/**
 * Row-order encoding of the hot (current hour) segment. Each row is delta-coded against the previous
 * row of the same key, so the codec carries per-key state across frames: a reader must decode the
 * frames of one file in order with one instance.
 *
 * <pre>varint key | flags (state:2, value kind:2, error:1) | zigzag time delta | varint latency | value | [varint error]</pre>
 */
public final class RowCodec {

    private static final int ERROR_FLAG = 0x10;

    private long[] lastTime = new long[64];
    private double[] lastValue = filledNaN(64);

    public void encode(List<Row> rows, ByteSink out) {
        for (Row row : rows) {
            int key = row.key();
            grow(key);
            int kind = ValueCoding.kind(row.value(), lastValue[key]);
            int flags = row.state() | (kind << 2) | (row.error() != 0 ? ERROR_FLAG : 0);
            Varint.writeUnsigned(out, key);
            out.write(flags);
            Varint.writeSigned(out, row.at() - lastTime[key]);
            Varint.writeUnsigned(out, row.latencyMs());
            ValueCoding.write(out, kind, row.value(), lastValue[key]);
            if (row.error() != 0) {
                Varint.writeUnsigned(out, row.error());
            }
            lastTime[key] = row.at();
            if (kind != ValueCoding.NONE) {
                lastValue[key] = row.value();
            }
        }
    }

    public void decode(ByteBuffer in, Consumer<Row> sink) {
        Varint.decoding(() -> {
            while (in.hasRemaining()) {
                sink.accept(next(in));
            }
            return null;
        });
    }

    private Row next(ByteBuffer in) {
        int key = Varint.readInt(in);
        if (key > 1 << 24) {
            throw new CorruptDataException("key out of range");
        }
        grow(key);
        int flags = in.get() & 0xFF;
        int kind = (flags >> 2) & 3;
        long at = lastTime[key] + Varint.readSigned(in);
        int latency = Varint.readInt(in);
        double value = ValueCoding.read(in, kind, lastValue[key]);
        int error = (flags & ERROR_FLAG) != 0 ? Varint.readInt(in) : 0;
        lastTime[key] = at;
        if (kind != ValueCoding.NONE) {
            lastValue[key] = value;
        }
        return new Row(key, at, flags & 3, latency, value, error);
    }

    private void grow(int key) {
        if (key >= lastTime.length) {
            int size = Math.max(key + 1, lastTime.length * 2);
            int old = lastValue.length;
            lastTime = Arrays.copyOf(lastTime, size);
            lastValue = Arrays.copyOf(lastValue, size);
            Arrays.fill(lastValue, old, size, Double.NaN);
        }
    }

    private static double[] filledNaN(int size) {
        double[] values = new double[size];
        Arrays.fill(values, Double.NaN);
        return values;
    }
}
