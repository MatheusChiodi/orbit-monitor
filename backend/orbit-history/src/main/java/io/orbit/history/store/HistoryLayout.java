package io.orbit.history.store;

import io.orbit.history.rollup.Resolution;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * File layout under the data directory (docs/08 section 3). Days and hours are UTC so DST changes
 * never create duplicate or missing hours.
 *
 * <pre>
 * heartbeats/2026-10-18/14.wal   hot segment of the current hour
 * heartbeats/2026-10-18/14.seg   closed, compressed columnar block
 * heartbeats/2026-10-18/14.idx   sidecar index
 * rollups/heartbeats/1m/2026-10-18.seg   minute rollups, one compressed frame per hour
 * rollups/heartbeats/1h/2026-10-18.seg   hour rollups with latency sketches
 * events/2026-10-18.log          event records;  audit/2026-10-18.log  audit records
 * dictionary.json                key and error code dictionary
 * </pre>
 */
public record HistoryLayout(Path root) {

    public static final long HOUR = 3_600_000L;
    public static final long DAY = 24 * HOUR;

    public Path stream(String stream) {
        return root.resolve(stream);
    }

    public Path dayDir(String stream, long at) {
        return stream(stream).resolve(day(at).toString());
    }

    public Path hot(String stream, long hourStart) {
        return dayDir(stream, hourStart).resolve(hourName(hourStart) + ".wal");
    }

    public Path segment(String stream, long hourStart) {
        return dayDir(stream, hourStart).resolve(hourName(hourStart) + ".seg");
    }

    public Path index(String stream, long hourStart) {
        return dayDir(stream, hourStart).resolve(hourName(hourStart) + ".idx");
    }

    public Path rollups(String stream, Resolution resolution, long at) {
        return root.resolve("rollups").resolve(stream).resolve(resolution.label()).resolve(day(at) + ".seg");
    }

    public Path dayLog(String stream, long at) {
        return stream(stream).resolve(day(at) + ".log");
    }

    public Path dictionary() {
        return root.resolve("dictionary.json");
    }

    public static LocalDate day(long at) {
        return Instant.ofEpochMilli(at).atZone(ZoneOffset.UTC).toLocalDate();
    }

    public static long dayStart(LocalDate day) {
        return day.atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli();
    }

    public static long hourStart(long at) {
        return Math.floorDiv(at, HOUR) * HOUR;
    }

    /** Hour start encoded by a file such as {@code heartbeats/2026-10-18/14.wal}. */
    public static Optional<Long> hourOf(Path file) {
        String name = file.getFileName().toString();
        int dot = name.indexOf('.');
        Optional<LocalDate> day = parseDay(file.getParent().getFileName().toString());
        if (dot != 2 || day.isEmpty()) {
            return Optional.empty();
        }
        try {
            int hour = Integer.parseInt(name.substring(0, 2));
            return hour < 24 ? Optional.of(dayStart(day.get()) + hour * HOUR) : Optional.empty();
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public static Optional<LocalDate> parseDay(String name) {
        try {
            return Optional.of(LocalDate.parse(name.length() >= 10 ? name.substring(0, 10) : name));
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }

    /** Days present in a directory (day folders or day files), within {@code first..last}, oldest first. */
    public static List<LocalDate> storedDays(Path dir, LocalDate first, LocalDate last) {
        try {
            List<LocalDate> days = new ArrayList<>();
            for (Path child : list(dir)) {
                parseDay(child.getFileName().toString())
                        .filter(d -> !d.isBefore(first) && !d.isAfter(last) && !days.contains(d))
                        .ifPresent(days::add);
            }
            return days;
        } catch (IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    /** Children of a directory sorted by name; empty when it does not exist. */
    public static List<Path> list(Path dir) throws IOException {
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (Stream<Path> files = Files.list(dir)) {
            List<Path> sorted = new ArrayList<>(files.toList());
            sorted.sort(null);
            return sorted;
        }
    }

    private static String hourName(long hourStart) {
        int hour = Instant.ofEpochMilli(hourStart).atZone(ZoneOffset.UTC).getHour();
        return hour < 10 ? "0" + hour : Integer.toString(hour);
    }
}
