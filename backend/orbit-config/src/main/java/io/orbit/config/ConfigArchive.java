package io.orbit.config;

import java.nio.file.Path;
import java.util.List;

/**
 * BE-37: export every {@code orbit.<feature>.json} as one zip with secrets omitted, and import it back
 * with a dry-run diff before anything is written.
 */
public class ConfigArchive {

    /** One file of the import, compared with what is on disk. */
    public record FileChange(String file, List<String> added, List<String> changed, List<String> removed) {
    }

    public ConfigArchive(Path configDir) {
    }

    /** Zip of the config files; every {@code {"enc": ...}} secret is replaced by {@code null}. */
    public byte[] export() {
        throw new UnsupportedOperationException("BE-37 config export is not implemented yet");
    }

    /** Item ids added, changed or removed per file; nothing is written. */
    public List<FileChange> diff(byte[] archive) {
        throw new UnsupportedOperationException("BE-37 config import is not implemented yet");
    }

    /**
     * Writes the archive's files (each validated by its owner on reload); secrets missing from the
     * archive keep their current value. Non-config entries and path traversal are rejected.
     */
    public List<FileChange> apply(byte[] archive) {
        throw new UnsupportedOperationException("BE-37 config import is not implemented yet");
    }
}
