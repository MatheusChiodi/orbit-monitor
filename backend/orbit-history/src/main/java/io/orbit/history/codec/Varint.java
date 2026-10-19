package io.orbit.history.codec;

import java.nio.BufferUnderflowException;
import java.nio.ByteBuffer;

/** LEB128 variable-length integers; signed values are zig-zag mapped so small negatives stay short. */
public final class Varint {

    private Varint() {
    }

    public static void writeUnsigned(ByteSink out, long value) {
        while ((value & ~0x7FL) != 0) {
            out.write((int) ((value & 0x7F) | 0x80));
            value >>>= 7;
        }
        out.write((int) value);
    }

    public static void writeSigned(ByteSink out, long value) {
        writeUnsigned(out, (value << 1) ^ (value >> 63));
    }

    public static long readUnsigned(ByteBuffer in) {
        long result = 0;
        for (int shift = 0; shift < 64; shift += 7) {
            byte b = in.get();
            result |= (long) (b & 0x7F) << shift;
            if ((b & 0x80) == 0) {
                return result;
            }
        }
        throw new CorruptDataException("varint longer than 10 bytes");
    }

    public static long readSigned(ByteBuffer in) {
        long raw = readUnsigned(in);
        return (raw >>> 1) ^ -(raw & 1);
    }

    public static int readInt(ByteBuffer in) {
        long value = readUnsigned(in);
        if (value > Integer.MAX_VALUE) {
            throw new CorruptDataException("varint out of int range");
        }
        return (int) value;
    }

    /** Wraps a decode step so truncated input surfaces as {@link CorruptDataException}. */
    public static <T> T decoding(java.util.function.Supplier<T> step) {
        try {
            return step.get();
        } catch (BufferUnderflowException | IndexOutOfBoundsException e) {
            throw new CorruptDataException("truncated data");
        }
    }
}
