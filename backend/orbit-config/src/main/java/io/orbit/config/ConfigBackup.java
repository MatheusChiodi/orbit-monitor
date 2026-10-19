package io.orbit.config;

import java.nio.file.Path;
import java.util.List;
import java.util.function.UnaryOperator;

/**
 * BE-50: rotating, encrypted backups of the config directory ({@code orbit-backup-<timestamp>.zip.enc}),
 * keeping the last {@code keep} copies. The encryption function comes from the vault.
 */
public class ConfigBackup {

    public ConfigBackup(Path configDir, Path backupDir, int keep, UnaryOperator<byte[]> encrypt) {
    }

    /** Creates a backup and deletes the oldest beyond {@code keep}; returns the new file. */
    public Path create() {
        throw new UnsupportedOperationException("BE-50 config backup is not implemented yet");
    }

    public List<Path> list() {
        throw new UnsupportedOperationException("BE-50 config backup is not implemented yet");
    }
}
