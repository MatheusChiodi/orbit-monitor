package io.orbit.history.store;

import io.orbit.history.HistorySettings;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;
import java.util.function.BiConsumer;
import java.util.stream.Stream;

/**
 * Daily purge and disk limits (docs/08 section 5): whole days older than the retention window are
 * deleted (no rewriting), then the oldest days go while the store exceeds {@code maxDiskMb}. Today
 * is never deleted. Low free space is reported so the caller can stop raw writes.
 */
final class Retention {

    /** What one run did. */
    record Outcome(List<LocalDate> purged, boolean capExceeded, boolean lowDisk) {
    }

    private static final long MB = 1024L * 1024;

    private final HistoryLayout layout;
    private final HistorySettings settings;
    private final List<String> dayDirStreams;
    private final List<String> dayLogStreams;
    private final BiConsumer<Path, LocalDate> onPurge;

    Retention(HistoryLayout layout, HistorySettings settings, List<String> dayDirStreams, List<String> dayLogStreams,
              BiConsumer<Path, LocalDate> onPurge) {
        this.layout = layout;
        this.settings = settings;
        this.dayDirStreams = List.copyOf(dayDirStreams);
        this.dayLogStreams = List.copyOf(dayLogStreams);
        this.onPurge = onPurge;
    }

    Outcome run(LocalDate today, long freeBytes) throws IOException {
        List<LocalDate> purged = new ArrayList<>();
        LocalDate oldestKept = today.minusDays(settings.retentionDays() - 1L);
        TreeSet<LocalDate> days = days();
        for (LocalDate day : days) {
            if (day.isBefore(oldestKept)) {
                purge(day);
                purged.add(day);
            }
        }
        days.removeAll(purged);
        boolean capExceeded = false;
        while (size() > settings.maxDiskMb() * MB && !days.isEmpty() && days.first().isBefore(today)) {
            LocalDate oldest = days.pollFirst();
            purge(oldest);
            purged.add(oldest);
            capExceeded = true;
        }
        boolean lowDisk = freeBytes < settings.minFreeDiskMb() * MB;
        return new Outcome(purged, capExceeded, lowDisk);
    }

    /** Total bytes under the data directory. */
    long size() throws IOException {
        if (!Files.exists(layout.root())) {
            return 0;
        }
        try (Stream<Path> files = Files.walk(layout.root())) {
            return files.filter(Files::isRegularFile).mapToLong(p -> {
                try {
                    return Files.size(p);
                } catch (IOException e) {
                    return 0;
                }
            }).sum();
        }
    }

    private TreeSet<LocalDate> days() throws IOException {
        TreeSet<LocalDate> days = new TreeSet<>();
        for (String stream : dayDirStreams) {
            for (Path dir : HistoryLayout.list(layout.stream(stream))) {
                HistoryLayout.parseDay(dir.getFileName().toString()).ifPresent(days::add);
            }
            for (Path resolutionDir : HistoryLayout.list(layout.root().resolve("rollups").resolve(stream))) {
                for (Path file : HistoryLayout.list(resolutionDir)) {
                    HistoryLayout.parseDay(file.getFileName().toString()).ifPresent(days::add);
                }
            }
        }
        for (String stream : dayLogStreams) {
            for (Path file : HistoryLayout.list(layout.stream(stream))) {
                HistoryLayout.parseDay(file.getFileName().toString()).ifPresent(days::add);
            }
        }
        return days;
    }

    private void purge(LocalDate day) throws IOException {
        long start = HistoryLayout.dayStart(day);
        for (String stream : dayDirStreams) {
            Path dir = layout.dayDir(stream, start);
            deleteTree(dir);
            onPurge.accept(dir, day);
            for (Path resolutionDir : HistoryLayout.list(layout.root().resolve("rollups").resolve(stream))) {
                Files.deleteIfExists(resolutionDir.resolve(day + ".seg"));
            }
        }
        for (String stream : dayLogStreams) {
            Files.deleteIfExists(layout.dayLog(stream, start));
        }
    }

    private static void deleteTree(Path dir) throws IOException {
        if (!Files.exists(dir)) {
            return;
        }
        try (Stream<Path> files = Files.walk(dir)) {
            for (Path p : files.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(p);
            }
        }
    }
}
