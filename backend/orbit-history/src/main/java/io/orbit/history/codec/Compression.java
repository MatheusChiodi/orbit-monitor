package io.orbit.history.codec;

import com.github.luben.zstd.Zstd;

import java.io.ByteArrayOutputStream;
import java.util.zip.DataFormatException;
import java.util.zip.Deflater;
import java.util.zip.Inflater;

/**
 * Block codecs for closed segments. zstd (level 3, native via zstd-jni) is preferred; Deflate from
 * the JDK is the fallback when the native library cannot load on this platform.
 */
public enum Compression {

    ZSTD((byte) 1) {
        @Override
        public byte[] compress(byte[] raw) {
            return Zstd.compress(raw, ZSTD_LEVEL);
        }

        @Override
        public byte[] decompress(byte[] packed, int rawLength) {
            byte[] out = new byte[rawLength];
            long written;
            try {
                written = Zstd.decompressByteArray(out, 0, rawLength, packed, 0, packed.length);
            } catch (RuntimeException e) {
                throw new CorruptDataException("zstd block cannot be decoded");
            }
            if (Zstd.isError(written) || written != rawLength) {
                throw new CorruptDataException("zstd block has the wrong length");
            }
            return out;
        }
    },

    DEFLATE((byte) 2) {
        @Override
        public byte[] compress(byte[] raw) {
            Deflater deflater = new Deflater(DEFLATE_LEVEL);
            try {
                deflater.setInput(raw);
                deflater.finish();
                ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(64, raw.length / 4));
                byte[] chunk = new byte[16 * 1024];
                while (!deflater.finished()) {
                    out.write(chunk, 0, deflater.deflate(chunk));
                }
                return out.toByteArray();
            } finally {
                deflater.end();
            }
        }

        @Override
        public byte[] decompress(byte[] packed, int rawLength) {
            Inflater inflater = new Inflater();
            try {
                inflater.setInput(packed);
                byte[] out = new byte[rawLength];
                int n = 0;
                while (n < rawLength && !inflater.finished()) {
                    int read = inflater.inflate(out, n, rawLength - n);
                    if (read == 0 && (inflater.needsInput() || inflater.needsDictionary())) {
                        break;
                    }
                    n += read;
                }
                if (n != rawLength || !inflater.finished()) {
                    throw new CorruptDataException("deflate block has the wrong length");
                }
                return out;
            } catch (DataFormatException e) {
                throw new CorruptDataException("deflate block cannot be decoded");
            } finally {
                inflater.end();
            }
        }
    };

    static final int ZSTD_LEVEL = 3;
    static final int DEFLATE_LEVEL = 6;

    private static final Compression PREFERRED = detect();

    private final byte id;

    Compression(byte id) {
        this.id = id;
    }

    public abstract byte[] compress(byte[] raw);

    public abstract byte[] decompress(byte[] packed, int rawLength);

    public byte id() {
        return id;
    }

    /** zstd when its native library loads, Deflate otherwise. */
    public static Compression preferred() {
        return PREFERRED;
    }

    public static Compression of(byte id) {
        for (Compression c : values()) {
            if (c.id == id) {
                return c;
            }
        }
        throw new CorruptDataException("unknown codec " + id);
    }

    private static Compression detect() {
        try {
            byte[] probe = {1, 2, 3};
            return Zstd.decompress(Zstd.compress(probe, ZSTD_LEVEL), probe.length).length == 3 ? ZSTD : DEFLATE;
        } catch (LinkageError | RuntimeException e) {
            return DEFLATE;
        }
    }
}
