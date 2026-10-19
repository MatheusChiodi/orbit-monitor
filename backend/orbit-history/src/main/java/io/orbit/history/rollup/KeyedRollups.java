package io.orbit.history.rollup;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.CorruptDataException;
import io.orbit.history.codec.Varint;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * One closed hour of rollups as per-key blocks behind a small key table, so a query for one
 * monitor decodes only its own block instead of the whole hour.
 *
 * <pre>varint version | varint base | varint keys | (varint key, varint length)* | blocks (RollupCodec)</pre>
 */
public final class KeyedRollups {

    private static final int VERSION = 1;

    private KeyedRollups() {
    }

    public static byte[] encode(Resolution resolution, long base, List<Rollup> rollups) {
        Map<Integer, List<Rollup>> byKey = new TreeMap<>();
        rollups.forEach(r -> byKey.computeIfAbsent(r.key(), k -> new ArrayList<>()).add(r));
        List<byte[]> blocks = new ArrayList<>(byKey.size());
        ByteSink out = new ByteSink(64 + byKey.size() * 4);
        Varint.writeUnsigned(out, VERSION);
        Varint.writeUnsigned(out, base);
        Varint.writeUnsigned(out, byKey.size());
        byKey.forEach((key, list) -> {
            byte[] block = RollupCodec.encode(resolution, base, list);
            blocks.add(block);
            Varint.writeUnsigned(out, key);
            Varint.writeUnsigned(out, block.length);
        });
        blocks.forEach(out::write);
        return out.toByteArray();
    }

    /** Base time (the closed hour) of a batch. */
    public static long base(ByteBuffer in) {
        return Varint.decoding(() -> {
            header(in);
            return Varint.readUnsigned(in);
        });
    }

    public static List<Rollup> decode(ByteBuffer in, int key) {
        return Varint.decoding(() -> {
            header(in);
            Varint.readUnsigned(in);
            int n = Varint.readInt(in);
            long offset = 0;
            long found = -1;
            int length = 0;
            for (int i = 0; i < n; i++) {
                int k = Varint.readInt(in);
                int len = Varint.readInt(in);
                if (k == key) {
                    found = offset;
                    length = len;
                }
                offset += len;
            }
            if (found < 0) {
                return List.<Rollup>of();
            }
            if (in.position() + found + length > in.limit()) {
                throw new CorruptDataException("rollup block out of bounds");
            }
            ByteBuffer block = in.duplicate();
            block.position((int) (in.position() + found)).limit((int) (in.position() + found + length));
            return RollupCodec.decode(block);
        });
    }

    private static void header(ByteBuffer in) {
        if (Varint.readUnsigned(in) != VERSION) {
            throw new CorruptDataException("unsupported rollup batch version");
        }
    }
}
