package io.orbit.config;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.function.UnaryOperator;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * BE-50: rotating, encrypted backups of the config directory ({@code orbit-backup-<timestamp>.zip.enc}),
 * keeping the last {@code keep} copies. The encryption function comes from the vault. Unlike an
 * export (BE-37) the backup keeps the sealed secrets, because the whole zip is encrypted again.
 */
public class ConfigBackup {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmssSSS'Z'")
            .withZone(ZoneOffset.UTC);
    private static final Pattern BACKUP = Pattern.compile("orbit-backup-\\d{8}T\\d{9}Z-\\d{3}\\.zip\\.enc");

    private final Path configDir;
    private final Path backupDir;
    private final int keep;
    private final UnaryOperator<byte[]> encrypt;
    private final Clock clock;

    public ConfigBackup(Path configDir, Path backupDir, int keep, UnaryOperator<byte[]> encrypt) {
        this(configDir, backupDir, keep, encrypt, Clock.systemUTC());
    }

    public ConfigBackup(Path configDir, Path backupDir, int keep, UnaryOperator<byte[]> encrypt, Clock clock) {
        if (keep < 1) {
            throw new IllegalArgumentException("keep must be at least 1");
        }
        this.configDir = configDir;
        this.backupDir = backupDir;
        this.keep = keep;
        this.encrypt = encrypt;
        this.clock = clock;
    }

    /** Creates a backup and deletes the oldest beyond {@code keep}; returns the new file. */
    public synchronized Path create() {
        try {
            Files.createDirectories(backupDir);
            Path target = nextName();
            Files.write(target, encrypt.apply(zip()));
            AtomicFiles.restrictToOwner(target);
            List<Path> all = list();
            for (Path old : all.subList(Math.min(keep, all.size()), all.size())) {
                Files.deleteIfExists(old);
            }
            return target;
        } catch (IOException e) {
            throw new ConfigStorageException("Could not back up the configuration", e);
        }
    }

    /** Backups, newest first. */
    public synchronized List<Path> list() {
        if (!Files.isDirectory(backupDir)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(backupDir)) {
            return files.filter(p -> BACKUP.matcher(p.getFileName().toString()).matches())
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed()).toList();
        } catch (IOException e) {
            throw new ConfigStorageException("Could not list backups", e);
        }
    }

    /** Timestamped name; a sequence number keeps backups made within the same millisecond apart. */
    private Path nextName() {
        String stamp = STAMP.format(clock.instant());
        for (int seq = 0; seq < 1000; seq++) {
            Path candidate = backupDir.resolve("orbit-backup-" + stamp + "-" + String.format("%03d", seq) + ".zip.enc");
            if (!Files.exists(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Too many backups within one millisecond");
    }

    private byte[] zip() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            if (Files.isDirectory(configDir)) {
                try (Stream<Path> files = Files.list(configDir)) {
                    for (Path file : files.filter(Files::isRegularFile)
                            .filter(p -> ConfigArchive.CONFIG_FILE.matcher(p.getFileName().toString()).matches())
                            .sorted().toList()) {
                        zip.putNextEntry(new ZipEntry(file.getFileName().toString()));
                        zip.write(Files.readAllBytes(file));
                        zip.closeEntry();
                    }
                }
            }
        }
        return out.toByteArray();
    }
}
