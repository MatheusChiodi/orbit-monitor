package io.orbit.history.segment;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.Varint;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Closed-segment layout: rows regrouped by key and written column by column (times as
 * delta-of-delta, then states/flags, latencies, values, error codes). Similar bytes end up next to
 * each other, which is what lets zstd reach several times the row-order ratio.
 */
public final class ColumnBlock {

    private static final int ERROR_FLAG = 0x10;

    /** Uncompressed block plus one index entry per key. */
    public record Encoded(byte[] raw, List<SegmentIndex.Entry> entries) {
    }

    private ColumnBlock() {
    }

    public static Encoded encode(List<Row> input) {
        List<Row> rows = new ArrayList<>(input);
        rows.sort(Comparator.comparingInt(Row::key).thenComparingLong(Row::at));
        ByteSink out = new ByteSink(rows.size() * 6 + 64);
        List<SegmentIndex.Entry> entries = new ArrayList<>();
        int start = 0;
        while (start < rows.size()) {
            int end = start;
            while (end < rows.size() && rows.get(end).key() == rows.get(start).key()) {
                end++;
            }
            int offset = out.size();
            writeKey(rows.subList(start, end), out);
            entries.add(entry(rows.subList(start, end), offset, out.size() - offset));
            start = end;
        }
        return new Encoded(out.toByteArray(), entries);
    }

    public static List<Row> decode(byte[] raw, SegmentIndex.Entry entry) {
        ByteBuffer in = ByteBuffer.wrap(raw, entry.offset(), entry.length());
        return Varint.decoding(() -> readKey(in, entry.key()));
    }

    private static void writeKey(List<Row> rows, ByteSink out) {
        int n = rows.size();
        Varint.writeUnsigned(out, n);
        long prev = 0;
        long prevDelta = 0;
        for (int i = 0; i < n; i++) {
            long at = rows.get(i).at();
            if (i == 0) {
                Varint.writeUnsigned(out, at);
            } else {
                long delta = at - prev;
                Varint.writeSigned(out, delta - prevDelta);
                prevDelta = delta;
            }
            prev = at;
        }
        double last = Double.NaN;
        int[] kinds = new int[n];
        for (int i = 0; i < n; i++) {
            Row r = rows.get(i);
            kinds[i] = ValueCoding.kind(r.value(), last);
            if (kinds[i] != ValueCoding.NONE) {
                last = r.value();
            }
            out.write(r.state() | (kinds[i] << 2) | (r.error() != 0 ? ERROR_FLAG : 0));
        }
        for (Row r : rows) {
            Varint.writeUnsigned(out, r.latencyMs());
        }
        last = Double.NaN;
        for (int i = 0; i < n; i++) {
            Row r = rows.get(i);
            ValueCoding.write(out, kinds[i], r.value(), last);
            if (kinds[i] != ValueCoding.NONE) {
                last = r.value();
            }
        }
        for (Row r : rows) {
            if (r.error() != 0) {
                Varint.writeUnsigned(out, r.error());
            }
        }
    }

    private static List<Row> readKey(ByteBuffer in, int key) {
        int n = Varint.readInt(in);
        long[] times = new long[n];
        long prevDelta = 0;
        for (int i = 0; i < n; i++) {
            if (i == 0) {
                times[i] = Varint.readUnsigned(in);
            } else {
                prevDelta += Varint.readSigned(in);
                times[i] = times[i - 1] + prevDelta;
            }
        }
        int[] flags = new int[n];
        for (int i = 0; i < n; i++) {
            flags[i] = in.get() & 0xFF;
        }
        int[] latencies = new int[n];
        for (int i = 0; i < n; i++) {
            latencies[i] = Varint.readInt(in);
        }
        double[] values = new double[n];
        double last = Double.NaN;
        for (int i = 0; i < n; i++) {
            int kind = (flags[i] >> 2) & 3;
            values[i] = ValueCoding.read(in, kind, last);
            if (kind != ValueCoding.NONE) {
                last = values[i];
            }
        }
        List<Row> rows = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            int error = (flags[i] & ERROR_FLAG) != 0 ? Varint.readInt(in) : 0;
            rows.add(new Row(key, times[i], flags[i] & 3, latencies[i], values[i], error));
        }
        return rows;
    }

    private static SegmentIndex.Entry entry(List<Row> rows, int offset, int length) {
        int latMin = Integer.MAX_VALUE;
        int latMax = 0;
        long latSum = 0;
        int valueCount = 0;
        double vMin = Double.NaN;
        double vMax = Double.NaN;
        double vSum = 0;
        int[] states = new int[4];
        for (Row r : rows) {
            latMin = Math.min(latMin, r.latencyMs());
            latMax = Math.max(latMax, r.latencyMs());
            latSum += r.latencyMs();
            states[r.state()]++;
            if (r.hasValue()) {
                vMin = valueCount == 0 ? r.value() : Math.min(vMin, r.value());
                vMax = valueCount == 0 ? r.value() : Math.max(vMax, r.value());
                vSum += r.value();
                valueCount++;
            }
        }
        return new SegmentIndex.Entry(rows.getFirst().key(), offset, length, rows.size(), rows.getFirst().at(),
                rows.getLast().at(), latMin, latMax, latSum, valueCount, vMin, vMax, vSum, states);
    }
}
