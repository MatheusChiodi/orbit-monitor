package io.orbit.history.segment;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.Varint;

import java.nio.ByteBuffer;

/** Value column: absent, repeated, integer delta (zig-zag varint) or raw float64. */
final class ValueCoding {

    static final int NONE = 0;
    static final int SAME = 1;
    static final int LONG_DELTA = 2;
    static final int DOUBLE = 3;

    private static final double MAX_EXACT = 9.007199254740992E15;

    private ValueCoding() {
    }

    static int kind(double value, double previous) {
        if (Double.isNaN(value)) {
            return NONE;
        }
        if (Double.compare(value, previous) == 0) {
            return SAME;
        }
        return isWhole(value) && (Double.isNaN(previous) || isWhole(previous)) ? LONG_DELTA : DOUBLE;
    }

    static void write(ByteSink out, int kind, double value, double previous) {
        if (kind == LONG_DELTA) {
            long base = Double.isNaN(previous) ? 0 : (long) previous;
            Varint.writeSigned(out, (long) value - base);
        } else if (kind == DOUBLE) {
            out.writeLong(Double.doubleToRawLongBits(value));
        }
    }

    static double read(ByteBuffer in, int kind, double previous) {
        return switch (kind) {
            case NONE -> Double.NaN;
            case SAME -> previous;
            case LONG_DELTA -> (double) ((Double.isNaN(previous) ? 0 : (long) previous) + Varint.readSigned(in));
            default -> Double.longBitsToDouble(in.getLong());
        };
    }

    private static boolean isWhole(double v) {
        return v == Math.rint(v) && Math.abs(v) < MAX_EXACT && !(v == 0 && Double.doubleToRawLongBits(v) != 0);
    }
}
