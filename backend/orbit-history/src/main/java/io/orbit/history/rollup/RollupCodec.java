package io.orbit.history.rollup;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.CorruptDataException;
import io.orbit.history.codec.Varint;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.IntPredicate;

/**
 * Columnar batch encoding of rollups for one resolution. Rollups are sorted by key and bucket and
 * every field group goes to its own column. Sums are stored as residuals over what min and max
 * already imply ({@code sum - min - max - (n-2)·min}), which is zero for the common two-sample
 * minute, so those columns compress to almost nothing.
 */
public final class RollupCodec {

    private static final int VERSION = 1;
    private static final int COLUMNS = 7;
    private static final double MAX_EXACT = 9.007199254740992E15;

    private RollupCodec() {
    }

    public static byte[] encode(Resolution resolution, long base, List<Rollup> input) {
        List<Rollup> rollups = new ArrayList<>(input);
        rollups.sort(Comparator.comparingInt(Rollup::key).thenComparingLong(Rollup::start));
        ByteSink[] col = new ByteSink[COLUMNS];
        for (int i = 0; i < COLUMNS; i++) {
            col[i] = new ByteSink(rollups.size() * 2 + 16);
        }
        int prevKey = 0;
        long prevSlot = 0;
        long prevLatMin = 0;
        long prevValueMin = 0;
        for (Rollup r : rollups) {
            long slot = (r.start() - base) / resolution.millis();
            Varint.writeUnsigned(col[0], r.key() - prevKey);
            Varint.writeSigned(col[0], slot - prevSlot);
            prevKey = r.key();
            prevSlot = slot;

            Varint.writeUnsigned(col[1], r.count());
            Varint.writeUnsigned(col[1], r.stateCount(3));
            Varint.writeUnsigned(col[1], r.stateCount(2));
            Varint.writeUnsigned(col[1], r.stateCount(1));
            Varint.writeUnsigned(col[1], r.count() - r.latencyCount());

            long lc = r.latencyCount();
            if (lc > 0) {
                long min = r.latencyMin();
                long max = r.latencyMax();
                Varint.writeSigned(col[2], min - prevLatMin);
                Varint.writeUnsigned(col[2], max - min);
                prevLatMin = min;
                if (lc > 1) {
                    Varint.writeSigned(col[3], r.latencySum() - min - max - (lc - 2) * min);
                    Varint.writeSigned(col[3], Math.round(r.latencySumSq()) - min * min - max * max
                            - (lc - 2) * min * min);
                }
            }

            long vc = r.valueCount();
            Varint.writeUnsigned(col[4], vc);
            if (vc > 0) {
                double magnitude = Math.max(Math.abs(r.valueMin()), Math.abs(r.valueMax()));
                boolean whole = whole(r.valueMin()) && whole(r.valueMax()) && whole(r.valueSum())
                        && whole(r.valueSumSq()) && magnitude * magnitude * vc < MAX_EXACT;
                col[4].write(whole ? 0 : 1);
                if (whole) {
                    long min = (long) r.valueMin();
                    long max = (long) r.valueMax();
                    Varint.writeSigned(col[5], min - prevValueMin);
                    Varint.writeUnsigned(col[5], max - min);
                    prevValueMin = min;
                    if (vc > 1) {
                        Varint.writeSigned(col[5], (long) r.valueSum() - min - max - (vc - 2) * min);
                        Varint.writeSigned(col[5], (long) r.valueSumSq() - min * min - max * max
                                - (vc - 2) * min * min);
                    }
                } else {
                    col[5].writeLong(Double.doubleToRawLongBits(r.valueMin()));
                    col[5].writeLong(Double.doubleToRawLongBits(r.valueMax()));
                    col[5].writeLong(Double.doubleToRawLongBits(r.valueSum()));
                    col[5].writeLong(Double.doubleToRawLongBits(r.valueSumSq()));
                }
            }

            col[6].write(r.sketch() == null ? 0 : 1);
            if (r.sketch() != null) {
                r.sketch().write(col[6]);
            }
        }
        ByteSink out = new ByteSink(64);
        Varint.writeUnsigned(out, VERSION);
        Varint.writeUnsigned(out, resolution.ordinal());
        Varint.writeUnsigned(out, base);
        Varint.writeUnsigned(out, rollups.size());
        for (ByteSink c : col) {
            Varint.writeUnsigned(out, c.size());
        }
        for (ByteSink c : col) {
            out.write(c.toByteArray());
        }
        return out.toByteArray();
    }

    public static List<Rollup> decode(ByteBuffer in) {
        return decode(in, key -> true);
    }

    /** Decodes only the rollups whose key matches; the others are parsed but not allocated. */
    public static List<Rollup> decode(ByteBuffer in, IntPredicate keys) {
        return Varint.decoding(() -> {
            if (Varint.readUnsigned(in) != VERSION) {
                throw new CorruptDataException("unsupported rollup version");
            }
            int ordinal = Varint.readInt(in);
            if (ordinal >= Resolution.values().length) {
                throw new CorruptDataException("unknown resolution");
            }
            Resolution resolution = Resolution.values()[ordinal];
            long base = Varint.readUnsigned(in);
            int n = Varint.readInt(in);
            ByteBuffer[] col = columns(in);
            List<Rollup> rollups = new ArrayList<>();
            int key = 0;
            long slot = 0;
            long latMinPrev = 0;
            long valueMinPrev = 0;
            for (int i = 0; i < n; i++) {
                key += Varint.readInt(col[0]);
                slot += Varint.readSigned(col[0]);
                long count = Varint.readUnsigned(col[1]);
                long down = Varint.readUnsigned(col[1]);
                long warn = Varint.readUnsigned(col[1]);
                long unknown = Varint.readUnsigned(col[1]);
                long lc = count - Varint.readUnsigned(col[1]);
                long latMin = 0;
                long latMax = 0;
                long latSum = 0;
                long latSumSq = 0;
                if (lc > 0) {
                    latMin = latMinPrev + Varint.readSigned(col[2]);
                    latMax = latMin + Varint.readUnsigned(col[2]);
                    latMinPrev = latMin;
                    latSum = lc == 1 ? latMin : latMin + latMax + (lc - 2) * latMin + Varint.readSigned(col[3]);
                    latSumSq = lc == 1 ? latMin * latMin
                            : latMin * latMin + latMax * latMax + (lc - 2) * latMin * latMin
                            + Varint.readSigned(col[3]);
                }
                long vc = Varint.readUnsigned(col[4]);
                double vMin = Double.NaN;
                double vMax = Double.NaN;
                double vSum = 0;
                double vSumSq = 0;
                if (vc > 0) {
                    if (col[4].get() == 0) {
                        long min = valueMinPrev + Varint.readSigned(col[5]);
                        long max = min + Varint.readUnsigned(col[5]);
                        valueMinPrev = min;
                        vMin = min;
                        vMax = max;
                        vSum = vc == 1 ? min : min + max + (vc - 2) * min + Varint.readSigned(col[5]);
                        vSumSq = vc == 1 ? (double) min * min
                                : min * min + max * max + (vc - 2) * min * min + Varint.readSigned(col[5]);
                    } else {
                        vMin = Double.longBitsToDouble(col[5].getLong());
                        vMax = Double.longBitsToDouble(col[5].getLong());
                        vSum = Double.longBitsToDouble(col[5].getLong());
                        vSumSq = Double.longBitsToDouble(col[5].getLong());
                    }
                }
                boolean wanted = keys.test(key);
                LatencySketch sketch = null;
                if (col[6].get() == 1) {
                    if (wanted) {
                        sketch = LatencySketch.read(col[6]);
                    } else {
                        LatencySketch.skip(col[6]);
                    }
                }
                if (!wanted) {
                    continue;
                }
                Rollup r = new Rollup(key, base + slot * resolution.millis(), false);
                long ok = count - down - warn - unknown;
                r.restore(count, new long[] {ok, unknown, warn, down}, lc, lc == 0 ? Long.MAX_VALUE : latMin,
                        latMax, latSum, latSumSq, vc, vMin, vMax, vSum, vSumSq, sketch);
                rollups.add(r);
            }
            return rollups;
        });
    }

    private static ByteBuffer[] columns(ByteBuffer in) {
        int[] sizes = new int[COLUMNS];
        for (int i = 0; i < COLUMNS; i++) {
            sizes[i] = Varint.readInt(in);
        }
        ByteBuffer[] col = new ByteBuffer[COLUMNS];
        int pos = in.position();
        for (int i = 0; i < COLUMNS; i++) {
            if (sizes[i] > in.limit() - pos) {
                throw new CorruptDataException("rollup column out of bounds");
            }
            col[i] = in.duplicate();
            col[i].position(pos).limit(pos + sizes[i]);
            pos += sizes[i];
        }
        return col;
    }

    private static boolean whole(double v) {
        return v == Math.rint(v) && Math.abs(v) < MAX_EXACT;
    }
}
