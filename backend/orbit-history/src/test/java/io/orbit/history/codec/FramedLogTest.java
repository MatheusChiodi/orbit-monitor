package io.orbit.history.codec;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FramedLogTest {

    @TempDir
    Path dir;

    @Test
    void appendedFramesAreReadBackInOrder() throws IOException {
        Path file = dir.resolve("a.wal");
        try (FramedLog log = FramedLog.open(file)) {
            log.append(bytes(1, 2, 3));
            log.append(bytes(4));
            log.force();
        }

        assertThat(read(file)).containsExactly(bytes(1, 2, 3), bytes(4));
    }

    @Test
    void tornTailIsDetectedAndTruncatedOnOpen() throws IOException {
        Path file = dir.resolve("b.wal");
        try (FramedLog log = FramedLog.open(file)) {
            log.append(bytes(1, 2, 3));
            log.append(bytes(9, 9, 9, 9, 9, 9));
        }
        long full = Files.size(file);
        try (FileChannel ch = FileChannel.open(file, StandardOpenOption.WRITE)) {
            ch.truncate(full - 3);
        }

        FramedLog.Recovery recovery;
        try (FramedLog log = FramedLog.open(file)) {
            recovery = log.recovery();
            log.append(bytes(7));
        }

        assertThat(recovery.truncatedBytes()).isPositive();
        assertThat(recovery.frames()).isEqualTo(1);
        assertThat(read(file)).containsExactly(bytes(1, 2, 3), bytes(7));
    }

    @Test
    void flippedByteFailsTheChecksumAndDropsTheRest() throws IOException {
        Path file = dir.resolve("c.wal");
        try (FramedLog log = FramedLog.open(file)) {
            log.append(bytes(1));
            log.append(bytes(2, 2));
            log.append(bytes(3, 3, 3));
        }
        try (FileChannel ch = FileChannel.open(file, StandardOpenOption.WRITE)) {
            ch.write(ByteBuffer.wrap(new byte[] {(byte) 0x55}), FramedLog.HEADER_BYTES + 13);
        }

        try (FramedLog log = FramedLog.open(file)) {
            assertThat(log.recovery().frames()).isEqualTo(1);
        }
        assertThat(read(file)).containsExactly(bytes(1));
    }

    @Test
    void fileWithoutValidHeaderStartsEmpty() throws IOException {
        Path file = dir.resolve("d.wal");
        Files.write(file, new byte[] {1, 2, 3, 4, 5, 6, 7, 8, 9, 10});

        try (FramedLog log = FramedLog.open(file)) {
            assertThat(log.recovery().frames()).isZero();
            log.append(bytes(5));
        }

        assertThat(read(file)).containsExactly(bytes(5));
    }

    private static List<byte[]> read(Path file) throws IOException {
        List<byte[]> frames = new ArrayList<>();
        FramedLog.read(file, frame -> {
            byte[] copy = new byte[frame.remaining()];
            frame.get(copy);
            frames.add(copy);
        });
        return frames;
    }

    private static byte[] bytes(int... values) {
        byte[] out = new byte[values.length];
        for (int i = 0; i < values.length; i++) {
            out[i] = (byte) values[i];
        }
        return out;
    }
}
