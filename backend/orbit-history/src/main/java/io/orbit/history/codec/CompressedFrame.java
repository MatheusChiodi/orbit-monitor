package io.orbit.history.codec;

import java.nio.ByteBuffer;

/** A compressed payload with its codec and raw length: {@code codec id | varint raw length | bytes}. */
public final class CompressedFrame {

    private CompressedFrame() {
    }

    public static byte[] pack(byte[] raw, Compression codec) {
        byte[] packed = codec.compress(raw);
        ByteSink out = new ByteSink(packed.length + 8);
        out.write(codec.id());
        Varint.writeUnsigned(out, raw.length);
        out.write(packed);
        return out.toByteArray();
    }

    public static byte[] unpack(ByteBuffer frame) {
        return Varint.decoding(() -> {
            Compression codec = Compression.of(frame.get());
            int rawLength = Varint.readInt(frame);
            byte[] packed = new byte[frame.remaining()];
            frame.get(packed);
            return codec.decompress(packed, rawLength);
        });
    }
}
