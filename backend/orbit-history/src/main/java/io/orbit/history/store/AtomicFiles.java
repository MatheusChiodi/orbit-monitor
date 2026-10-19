package io.orbit.history.store;

import io.orbit.history.codec.FramedLog;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/** Whole-file writes that are visible either completely or not at all ({@code .tmp} + rename). */
final class AtomicFiles {

    static final String TMP = ".tmp";

    private AtomicFiles() {
    }

    /** Writes a single CRC-protected frame to {@code target} atomically. */
    static void writeFrame(Path target, byte[] payload) throws IOException {
        Path tmp = target.resolveSibling(target.getFileName() + TMP);
        Files.deleteIfExists(tmp);
        try (FramedLog log = FramedLog.open(tmp)) {
            log.append(payload);
            log.force();
        }
        move(tmp, target);
    }

    /** Reads the single frame of a file written by {@link #writeFrame}; null when missing or damaged. */
    static ByteBuffer readFrame(Path file) throws IOException {
        ByteBuffer[] holder = new ByteBuffer[1];
        FramedLog.read(file, frame -> {
            if (holder[0] == null) {
                holder[0] = frame;
            }
        });
        return holder[0];
    }

    static void move(Path from, Path to) throws IOException {
        try {
            Files.move(from, to, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(from, to, StandardCopyOption.REPLACE_EXISTING);
        }
    }
}
