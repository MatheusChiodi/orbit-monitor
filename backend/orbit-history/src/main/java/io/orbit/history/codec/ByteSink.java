package io.orbit.history.codec;

import java.nio.ByteBuffer;
import java.util.Arrays;

/** Growable byte buffer used by the encoders; not thread-safe. */
public final class ByteSink {

    private byte[] bytes;
    private int size;

    public ByteSink(int initialCapacity) {
        bytes = new byte[Math.max(16, initialCapacity)];
    }

    public void write(int b) {
        ensure(1);
        bytes[size++] = (byte) b;
    }

    public void write(byte[] src) {
        write(src, 0, src.length);
    }

    public void write(byte[] src, int offset, int length) {
        ensure(length);
        System.arraycopy(src, offset, bytes, size, length);
        size += length;
    }

    public void writeInt(int value) {
        ensure(4);
        bytes[size++] = (byte) (value >>> 24);
        bytes[size++] = (byte) (value >>> 16);
        bytes[size++] = (byte) (value >>> 8);
        bytes[size++] = (byte) value;
    }

    public void writeLong(long value) {
        writeInt((int) (value >>> 32));
        writeInt((int) value);
    }

    public int size() {
        return size;
    }

    public void reset() {
        size = 0;
    }

    public byte[] toByteArray() {
        return Arrays.copyOf(bytes, size);
    }

    /** A read-only view of the written bytes; valid until the next write or reset. */
    public ByteBuffer toBuffer() {
        return ByteBuffer.wrap(bytes, 0, size).asReadOnlyBuffer();
    }

    private void ensure(int extra) {
        if (size + extra > bytes.length) {
            bytes = Arrays.copyOf(bytes, Math.max(bytes.length * 2, size + extra));
        }
    }
}
