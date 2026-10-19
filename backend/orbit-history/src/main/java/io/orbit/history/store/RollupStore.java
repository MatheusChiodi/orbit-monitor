package io.orbit.history.store;

import io.orbit.history.codec.CompressedFrame;
import io.orbit.history.codec.Compression;
import io.orbit.history.codec.CorruptDataException;
import io.orbit.history.codec.FramedLog;
import io.orbit.history.rollup.Resolution;
import io.orbit.history.rollup.Rollup;
import io.orbit.history.rollup.KeyedRollups;
import io.orbit.history.segment.Row;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Per-day files of 1-minute and 1-hour rollups. Each closed hour appends one compressed frame per
 * resolution, so day files never need rewriting; decompressed frames are cached by file size.
 */
final class RollupStore {

    private static final long CACHE_BYTES = 64L * 1024 * 1024;

    private record CachedDay(long size, List<byte[]> frames, long bytes) {
    }

    private final HistoryLayout layout;
    private final String stream;
    private final Compression codec;
    private long cachedBytes;
    private final Map<Path, CachedDay> cache = new LinkedHashMap<>(64, 0.75f, true);

    RollupStore(HistoryLayout layout, String stream, Compression codec) {
        this.layout = layout;
        this.stream = stream;
        this.codec = codec;
    }

    /** Builds and appends the minute and hour rollups of one closed hour's rows. */
    void append(long hourStart, List<Row> rows) throws IOException {
        for (Resolution resolution : List.of(Resolution.MINUTE, Resolution.HOUR)) {
            Map<Long, Rollup> buckets = new TreeMap<>();
            for (Row row : rows) {
                long start = resolution.bucketStart(row.at());
                long id = (start / resolution.millis()) << 24 | row.key();
                buckets.computeIfAbsent(id, k -> new Rollup(row.key(), start, resolution == Resolution.HOUR))
                        .add(row);
            }
            byte[] raw = KeyedRollups.encode(resolution, hourStart, new ArrayList<>(buckets.values()));
            Path file = layout.rollups(stream, resolution, hourStart);
            try (FramedLog log = FramedLog.open(file)) {
                log.append(CompressedFrame.pack(raw, codec));
                log.force();
            }
        }
    }

    /** Rollups of {@code key} with {@code from <= start < to}; duplicates of a bucket are merged. */
    List<Rollup> query(Resolution resolution, int key, long from, long to) {
        TreeMap<Long, Rollup> merged = new TreeMap<>();
        LocalDate last = HistoryLayout.day(to + HistoryLayout.HOUR);
        Path dir = layout.rollups(stream, resolution, from).getParent();
        for (LocalDate d : HistoryLayout.storedDays(dir, HistoryLayout.day(from), last)) {
            for (byte[] raw : frames(layout.rollups(stream, resolution, HistoryLayout.dayStart(d)))) {
                for (Rollup r : KeyedRollups.decode(ByteBuffer.wrap(raw), key)) {
                    if (r.start() >= from && r.start() < to) {
                        merged.merge(r.start(), r, (a, b) -> {
                            a.merge(b);
                            return a;
                        });
                    }
                }
            }
        }
        return new ArrayList<>(merged.values());
    }

    /** Hours whose rollups are stored in the day's hourly file (frame base times). */
    Set<Long> hours(LocalDate day) {
        Set<Long> hours = new HashSet<>();
        for (byte[] raw : frames(layout.rollups(stream, Resolution.HOUR, HistoryLayout.dayStart(day)))) {
            hours.add(KeyedRollups.base(ByteBuffer.wrap(raw)));
        }
        return hours;
    }

    synchronized void forget(Path file) {
        CachedDay removed = cache.remove(file);
        if (removed != null) {
            cachedBytes -= removed.bytes();
        }
    }

    private synchronized List<byte[]> frames(Path file) {
        try {
            if (!Files.exists(file)) {
                forget(file);
                return List.of();
            }
            long size = Files.size(file);
            CachedDay cached = cache.get(file);
            if (cached != null && cached.size() == size) {
                return cached.frames();
            }
            List<byte[]> frames = new ArrayList<>();
            FramedLog.read(file, frame -> {
                try {
                    frames.add(CompressedFrame.unpack(frame));
                } catch (CorruptDataException ignored) {
                    // A damaged frame is skipped; the hour is rebuilt from raw data on next start.
                }
            });
            long bytes = frames.stream().mapToLong(f -> f.length).sum();
            forget(file);
            cache.put(file, new CachedDay(size, frames, bytes));
            cachedBytes += bytes;
            var it = cache.entrySet().iterator();
            while (cachedBytes > CACHE_BYTES && it.hasNext()) {
                var eldest = it.next();
                if (!eldest.getKey().equals(file)) {
                    cachedBytes -= eldest.getValue().bytes();
                    it.remove();
                }
            }
            return frames;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
