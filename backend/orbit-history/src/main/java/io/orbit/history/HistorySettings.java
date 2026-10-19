package io.orbit.history;

import java.nio.file.Path;
import java.util.Objects;

/**
 * Store settings ({@code history.*} in orbit.settings.json, docs/08 section 5).
 *
 * @param retentionDays days kept, 1–30
 * @param maxDiskMb     when exceeded the oldest days are dropped first
 * @param minFreeDiskMb below this free space raw writes stop and only rollups are kept
 */
public record HistorySettings(Path dataDir, int retentionDays, long maxDiskMb, long minFreeDiskMb) {

    public static final int MAX_RETENTION_DAYS = 30;

    public HistorySettings {
        Objects.requireNonNull(dataDir, "dataDir");
        if (retentionDays < 1 || retentionDays > MAX_RETENTION_DAYS) {
            throw new IllegalArgumentException("history.retentionDays must be between 1 and 30");
        }
        if (maxDiskMb < 1 || minFreeDiskMb < 0) {
            throw new IllegalArgumentException("history disk limits must be positive");
        }
    }

    public static HistorySettings defaults(Path dataDir) {
        return new HistorySettings(dataDir, MAX_RETENTION_DAYS, 1024, 512);
    }
}
