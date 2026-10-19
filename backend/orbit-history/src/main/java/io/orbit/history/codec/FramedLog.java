package io.orbit.history.codec;

import java.io.Closeable;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.function.Consumer;
import java.util.zip.CRC32;

/**
 * Append-only file of length-prefixed frames, each followed by its CRC32. A torn tail left by a
 * crash (partial frame or checksum mismatch) is detected and truncated on open, so at most the
 * frame being written is lost.
 *
 * <pre>header: "OWL1" + 4 reserved bytes; frame: int length, payload, int crc32(payload)</pre>
 */
public final class FramedLog implements Closeable {

    public static final int HEADER_BYTES = 8;
    static final int MAX_FRAME = 64 * 1024 * 1024;
    private static final byte[] MAGIC = {'O', 'W', 'L', '1', 0, 0, 0, 0};

    /** What the open-time scan found: valid frames kept and bytes cut from the tail. */
    public record Recovery(int frames, long truncatedBytes) {
    }

    private final FileChannel channel;
    private final Recovery recovery;
    private final CRC32 crc = new CRC32();

    private FramedLog(FileChannel channel, Recovery recovery) {
        this.channel = channel;
        this.recovery = recovery;
    }

    /** Opens or creates the log, validates every frame and truncates a torn tail. */
    public static FramedLog open(Path file) throws IOException {
        Files.createDirectories(file.getParent());
        boolean fresh = !Files.exists(file);
        FileChannel channel = FileChannel.open(file, StandardOpenOption.CREATE, StandardOpenOption.READ,
                StandardOpenOption.WRITE);
        try {
            if (fresh) {
                FilePermissions.ownerOnly(file);
            }
            long size = channel.size();
            Scan scan = scan(channel, null);
            long cut = scan.headerOk ? size - scan.validEnd : size;
            if (!scan.headerOk) {
                channel.truncate(0);
                channel.write(ByteBuffer.wrap(MAGIC), 0);
                scan = new Scan(true, 0, HEADER_BYTES);
            } else if (scan.validEnd < size) {
                channel.truncate(scan.validEnd);
            }
            channel.position(scan.validEnd);
            return new FramedLog(channel, new Recovery(scan.frames, cut));
        } catch (IOException | RuntimeException e) {
            channel.close();
            throw e;
        }
    }

    /** Streams every valid frame of a file without modifying it; stops silently at a torn tail. */
    public static Recovery read(Path file, Consumer<ByteBuffer> sink) throws IOException {
        try (FileChannel channel = FileChannel.open(file, StandardOpenOption.READ)) {
            Scan scan = scan(channel, sink);
            return new Recovery(scan.frames, channel.size() - scan.validEnd);
        }
    }

    public void append(byte[] payload) throws IOException {
        crc.reset();
        crc.update(payload);
        ByteBuffer frame = ByteBuffer.allocate(payload.length + 8);
        frame.putInt(payload.length).put(payload).putInt((int) crc.getValue()).flip();
        while (frame.hasRemaining()) {
            channel.write(frame);
        }
    }

    public void force() throws IOException {
        channel.force(false);
    }

    public long size() throws IOException {
        return channel.size();
    }

    public Recovery recovery() {
        return recovery;
    }

    @Override
    public void close() throws IOException {
        channel.close();
    }

    private record Scan(boolean headerOk, int frames, long validEnd) {
    }

    private static Scan scan(FileChannel channel, Consumer<ByteBuffer> sink) throws IOException {
        long size = channel.size();
        if (size < HEADER_BYTES) {
            return new Scan(false, 0, 0);
        }
        ByteBuffer header = ByteBuffer.allocate(HEADER_BYTES);
        readFully(channel, header, 0);
        for (int i = 0; i < 4; i++) {
            if (header.get(i) != MAGIC[i]) {
                return new Scan(false, 0, 0);
            }
        }
        long pos = HEADER_BYTES;
        int frames = 0;
        ByteBuffer len = ByteBuffer.allocate(4);
        CRC32 crc = new CRC32();
        while (pos + 8 <= size) {
            len.clear();
            readFully(channel, len, pos);
            int length = len.getInt(0);
            if (length < 0 || length > MAX_FRAME || pos + 8 + length > size) {
                break;
            }
            ByteBuffer body = ByteBuffer.allocate(length + 4);
            readFully(channel, body, pos + 4);
            crc.reset();
            crc.update(body.array(), 0, length);
            if ((int) crc.getValue() != body.getInt(length)) {
                break;
            }
            if (sink != null) {
                sink.accept(ByteBuffer.wrap(body.array(), 0, length).asReadOnlyBuffer());
            }
            pos += 8 + length;
            frames++;
        }
        return new Scan(true, frames, pos);
    }

    private static void readFully(FileChannel channel, ByteBuffer buf, long position) throws IOException {
        long pos = position;
        while (buf.hasRemaining()) {
            int n = channel.read(buf, pos);
            if (n < 0) {
                throw new CorruptDataException("unexpected end of file");
            }
            pos += n;
        }
        buf.flip();
    }
}
