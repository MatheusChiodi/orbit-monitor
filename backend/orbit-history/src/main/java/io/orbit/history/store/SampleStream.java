package io.orbit.history.store;

import io.orbit.history.codec.ByteSink;
import io.orbit.history.codec.Compression;
import io.orbit.history.codec.FramedLog;
import io.orbit.history.rollup.Resolution;
import io.orbit.history.rollup.Rollup;
import io.orbit.history.segment.Row;
import io.orbit.history.segment.RowCodec;

import java.io.Closeable;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Consumer;

/**
 * One sample stream (heartbeats or series): the hot segment of the current hour (WAL on disk plus
 * the rows in memory), the closed hourly segments and the rollups built when an hour closes.
 * Called by the single writer thread for writes; reads may come from any thread.
 */
final class SampleStream implements Closeable {

    private final HistoryLayout layout;
    private final String name;
    private final SegmentStore segments;
    private final RollupStore rollups;
    private final Consumer<String> warnings;
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

    private long hotHour = -1;
    /** Latest closed hour; later rows of it go to the current hour so a closed segment is never reopened. */
    private long lastClosed = -1;
    private FramedLog hot;
    private RowCodec codec = new RowCodec();
    private List<Row> current = new ArrayList<>();
    private volatile boolean rawEnabled = true;
    private final ByteSink frame = new ByteSink(64 * 1024);

    private SampleStream(HistoryLayout layout, String name, Compression compression, Consumer<String> warnings) {
        this.layout = layout;
        this.name = name;
        this.segments = new SegmentStore(layout, name, compression, warnings);
        this.rollups = new RollupStore(layout, name, compression);
        this.warnings = warnings;
    }

    /** Opens the stream and recovers from a crash: torn tails, stale hot segments, missing rollups. */
    static SampleStream open(HistoryLayout layout, String name, Compression compression, long now,
                             Consumer<String> warnings) throws IOException {
        SampleStream stream = new SampleStream(layout, name, compression, warnings);
        stream.recover(HistoryLayout.hourStart(now));
        return stream;
    }

    /** Appends a batch as one frame; a row of a later hour first closes the current hour. */
    void append(List<Row> rows) throws IOException {
        lock.writeLock().lock();
        try {
            List<Row> pending = new ArrayList<>();
            for (Row row : rows) {
                long hour = HistoryLayout.hourStart(row.at());
                if (lastClosed >= 0 && hour <= lastClosed) {
                    hour = hotHour >= 0 ? hotHour : lastClosed + HistoryLayout.HOUR;
                }
                if (hotHour < 0) {
                    startHour(hour);
                } else if (hour > hotHour) {
                    write(pending);
                    closeHour();
                    startHour(hour);
                }
                pending.add(row);
            }
            write(pending);
        } finally {
            lock.writeLock().unlock();
        }
    }

    /** Closes the current hour when the clock has moved past it, even without new rows. */
    void roll(long now) throws IOException {
        lock.writeLock().lock();
        try {
            if (hotHour >= 0 && HistoryLayout.hourStart(now) > hotHour) {
                closeHour();
            }
        } finally {
            lock.writeLock().unlock();
        }
    }

    /** Low-disk mode: when false, raw rows stay in memory only and closed hours keep just rollups. */
    void rawEnabled(boolean enabled) {
        rawEnabled = enabled;
    }

    void force() throws IOException {
        lock.readLock().lock();
        try {
            if (hot != null) {
                hot.force();
            }
        } finally {
            lock.readLock().unlock();
        }
    }

    List<Row> rows(int key, long from, long to) {
        List<Row> out = new ArrayList<>(segments.rows(key, from, to));
        out.addAll(currentRows(key, from, to));
        out.sort((a, b) -> Long.compare(a.at(), b.at()));
        return out;
    }

    /** Stored rollups plus those of the current hour computed from memory. */
    List<Rollup> rollups(Resolution resolution, int key, long from, long to) {
        TreeMap<Long, Rollup> merged = new TreeMap<>();
        for (Rollup r : rollups.query(resolution, key, from, to)) {
            merged.put(r.start(), r);
        }
        for (Row row : currentRows(key, resolution.bucketStart(from), to)) {
            long start = resolution.bucketStart(row.at());
            if (start >= from && start < to) {
                merged.computeIfAbsent(start, s -> new Rollup(key, s, resolution == Resolution.HOUR)).add(row);
            }
        }
        return new ArrayList<>(merged.values());
    }

    /** Oldest stored day of this stream, if any. */
    LocalDate oldestDay() throws IOException {
        for (Path dir : HistoryLayout.list(layout.stream(name))) {
            var day = HistoryLayout.parseDay(dir.getFileName().toString());
            if (day.isPresent() && Files.isDirectory(dir)) {
                return day.get();
            }
        }
        return null;
    }

    void forgetDay(Path dayDir, LocalDate day) {
        segments.forgetDay(dayDir);
        for (Resolution r : List.of(Resolution.MINUTE, Resolution.HOUR)) {
            rollups.forget(layout.rollups(name, r, HistoryLayout.dayStart(day)));
        }
    }

    /** Simulates a crash in tests: releases the file without closing the hour or syncing. */
    void abandon() throws IOException {
        if (hot != null) {
            hot.close();
            hot = null;
        }
    }

    @Override
    public void close() throws IOException {
        lock.writeLock().lock();
        try {
            if (hot != null) {
                hot.force();
                hot.close();
                hot = null;
            }
        } finally {
            lock.writeLock().unlock();
        }
    }

    private List<Row> currentRows(int key, long from, long to) {
        lock.readLock().lock();
        try {
            List<Row> out = new ArrayList<>();
            for (Row r : current) {
                if (r.key() == key && r.at() >= from && r.at() < to) {
                    out.add(r);
                }
            }
            return out;
        } finally {
            lock.readLock().unlock();
        }
    }

    private void write(List<Row> pending) throws IOException {
        if (pending.isEmpty()) {
            return;
        }
        if (rawEnabled) {
            if (hot == null) {
                hot = FramedLog.open(layout.hot(name, hotHour));
            }
            frame.reset();
            codec.encode(pending, frame);
            hot.append(frame.toByteArray());
        }
        current.addAll(pending);
        pending.clear();
    }

    private void startHour(long hour) {
        hotHour = hour;
        codec = new RowCodec();
        current = new ArrayList<>();
    }

    private void closeHour() throws IOException {
        Path wal = layout.hot(name, hotHour);
        if (hot != null) {
            hot.close();
            hot = null;
        }
        if (!current.isEmpty()) {
            List<Row> fresh = rawEnabled ? segments.close(hotHour, current) : current;
            if (!fresh.isEmpty()) {
                rollups.append(hotHour, fresh);
            }
        }
        Files.deleteIfExists(wal);
        lastClosed = Math.max(lastClosed, hotHour);
        hotHour = -1;
        current = new ArrayList<>();
    }

    private void recover(long nowHour) throws IOException {
        for (Path day : HistoryLayout.list(layout.stream(name))) {
            for (Path file : HistoryLayout.list(day)) {
                String fileName = file.getFileName().toString();
                if (fileName.endsWith(AtomicFiles.TMP)) {
                    Files.deleteIfExists(file);
                } else if (fileName.endsWith(".wal")) {
                    recoverHot(file, nowHour);
                }
            }
        }
        rebuildMissingRollups(nowHour);
    }

    private void recoverHot(Path wal, long nowHour) throws IOException {
        Long hour = HistoryLayout.hourOf(wal).orElse(null);
        if (hour == null) {
            return;
        }
        RowCodec reader = new RowCodec();
        List<Row> rows = new ArrayList<>();
        FramedLog log = FramedLog.open(wal);
        if (log.recovery().truncatedBytes() > 0) {
            warnings.accept("history hot segment had a torn tail; truncated " + log.recovery().truncatedBytes()
                    + " bytes: " + name);
        }
        FramedLog.read(wal, f -> reader.decode(f, rows::add));
        if (hour == nowHour && hotHour < 0) {
            hotHour = hour;
            hot = log;
            codec = reader;
            current = rows;
            return;
        }
        log.close();
        if (!rows.isEmpty()) {
            List<Row> fresh = segments.close(hour, rows);
            if (!fresh.isEmpty()) {
                rollups.append(hour, fresh);
            }
        }
        Files.deleteIfExists(wal);
        lastClosed = Math.max(lastClosed, hour);
    }

    private void rebuildMissingRollups(long nowHour) throws IOException {
        for (Path day : HistoryLayout.list(layout.stream(name))) {
            LocalDate date = HistoryLayout.parseDay(day.getFileName().toString()).orElse(null);
            if (date == null) {
                continue;
            }
            Set<Long> present = rollups.hours(date);
            for (long hour : segments.closedHours(date)) {
                if (hour < nowHour) {
                    lastClosed = Math.max(lastClosed, hour);
                }
                if (!present.contains(hour)) {
                    List<Row> rows = segments.hour(hour);
                    if (!rows.isEmpty()) {
                        rollups.append(hour, rows);
                        warnings.accept("history rollups rebuilt from raw data: " + name + " " + date);
                    }
                }
            }
        }
    }
}
