package io.orbit.history.segment;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.CorruptDataException;
import io.orbit.history.codec.Varint;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Sidecar index of a closed segment, read before the block: time range, record count and per-key
 * offsets plus min/max/sum aggregates, so most summaries never decompress the block.
 */
public record SegmentIndex(long minTime, long maxTime, long count, int rawLength, List<Entry> entries) {

    private static final int VERSION = 1;

    public SegmentIndex {
        entries = List.copyOf(entries);
    }

    /** Per-key statistics; {@code offset}/{@code length} locate the key's columns in the raw block. */
    public record Entry(int key, int offset, int length, int count, long minTime, long maxTime,
                        int latencyMin, int latencyMax, long latencySum,
                        int valueCount, double valueMin, double valueMax, double valueSum, int[] stateCounts) {

        @Override
        public boolean equals(Object o) {
            return o instanceof Entry e && key == e.key && offset == e.offset && count == e.count
                    && java.util.Arrays.equals(stateCounts, e.stateCounts);
        }

        @Override
        public int hashCode() {
            return 31 * key + offset;
        }
    }

    public static SegmentIndex of(List<Entry> entries, int rawLength) {
        long min = Long.MAX_VALUE;
        long max = Long.MIN_VALUE;
        long count = 0;
        for (Entry e : entries) {
            min = Math.min(min, e.minTime());
            max = Math.max(max, e.maxTime());
            count += e.count();
        }
        return new SegmentIndex(min, max, count, rawLength, entries);
    }

    public boolean overlaps(long from, long to) {
        return count > 0 && minTime < to && maxTime >= from;
    }

    public Optional<Entry> entry(int key) {
        for (Entry e : entries) {
            if (e.key() == key) {
                return Optional.of(e);
            }
        }
        return Optional.empty();
    }

    public byte[] encode() {
        ByteSink out = new ByteSink(64 + entries.size() * 48);
        Varint.writeUnsigned(out, VERSION);
        Varint.writeUnsigned(out, rawLength);
        Varint.writeUnsigned(out, entries.size());
        for (Entry e : entries) {
            Varint.writeUnsigned(out, e.key());
            Varint.writeUnsigned(out, e.offset());
            Varint.writeUnsigned(out, e.length());
            Varint.writeUnsigned(out, e.count());
            Varint.writeUnsigned(out, e.minTime());
            Varint.writeUnsigned(out, e.maxTime() - e.minTime());
            Varint.writeUnsigned(out, e.latencyMin());
            Varint.writeUnsigned(out, e.latencyMax());
            Varint.writeUnsigned(out, e.latencySum());
            Varint.writeUnsigned(out, e.valueCount());
            out.writeLong(Double.doubleToRawLongBits(e.valueMin()));
            out.writeLong(Double.doubleToRawLongBits(e.valueMax()));
            out.writeLong(Double.doubleToRawLongBits(e.valueSum()));
            for (int s : e.stateCounts()) {
                Varint.writeUnsigned(out, s);
            }
        }
        return out.toByteArray();
    }

    public static SegmentIndex decode(ByteBuffer in) {
        return Varint.decoding(() -> {
            if (Varint.readUnsigned(in) != VERSION) {
                throw new CorruptDataException("unsupported index version");
            }
            int rawLength = Varint.readInt(in);
            int n = Varint.readInt(in);
            List<Entry> entries = new ArrayList<>(n);
            for (int i = 0; i < n; i++) {
                int key = Varint.readInt(in);
                int offset = Varint.readInt(in);
                int length = Varint.readInt(in);
                int count = Varint.readInt(in);
                long minTime = Varint.readUnsigned(in);
                long maxTime = minTime + Varint.readUnsigned(in);
                int latMin = Varint.readInt(in);
                int latMax = Varint.readInt(in);
                long latSum = Varint.readUnsigned(in);
                int valueCount = Varint.readInt(in);
                double vMin = Double.longBitsToDouble(in.getLong());
                double vMax = Double.longBitsToDouble(in.getLong());
                double vSum = Double.longBitsToDouble(in.getLong());
                int[] states = new int[4];
                for (int s = 0; s < 4; s++) {
                    states[s] = Varint.readInt(in);
                }
                entries.add(new Entry(key, offset, length, count, minTime, maxTime, latMin, latMax, latSum,
                        valueCount, vMin, vMax, vSum, states));
            }
            return of(entries, rawLength);
        });
    }
}
