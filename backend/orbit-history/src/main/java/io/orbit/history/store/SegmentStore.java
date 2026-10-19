package io.orbit.history.store;

import io.orbit.history.codec.CompressedFrame;
import io.orbit.history.codec.Compression;
import io.orbit.history.codec.CorruptDataException;
import io.orbit.history.segment.ColumnBlock;
import io.orbit.history.segment.Row;
import io.orbit.history.segment.SegmentIndex;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Closed hourly segments of one stream: writes the compressed columnar block and its sidecar index
 * atomically, answers time-range reads through the indexes and quarantines damaged files
 * ({@code .bad}) so the rest of the history keeps working.
 */
final class SegmentStore {

    static final String BAD = ".bad";
    private static final int BLOCK_CACHE = 48;

    private final HistoryLayout layout;
    private final String stream;
    private final Compression codec;
    private final Consumer<String> warnings;
    private final Map<Path, SegmentIndex> indexes = new ConcurrentHashMap<>();
    private final Map<Path, byte[]> blocks = new LinkedHashMap<>(BLOCK_CACHE, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<Path, byte[]> eldest) {
            return size() > BLOCK_CACHE;
        }
    };

    SegmentStore(HistoryLayout layout, String stream, Compression codec, Consumer<String> warnings) {
        this.layout = layout;
        this.stream = stream;
        this.codec = codec;
        this.warnings = warnings;
    }

    /**
     * Writes the hour's rows as a verified block plus index. When the hour already has a segment
     * (late rows, or a crash between writing it and deleting the hot file) the rows are merged and
     * exact duplicates dropped. Returns the rows that were not stored before.
     */
    List<Row> close(long hourStart, List<Row> rows) throws IOException {
        Path seg = layout.segment(stream, hourStart);
        Path idx = layout.index(stream, hourStart);
        List<Row> fresh = new ArrayList<>(rows);
        List<Row> all = new ArrayList<>(rows);
        if (Files.exists(idx)) {
            List<Row> existing = hour(hourStart);
            Set<Row> stored = new HashSet<>(existing);
            fresh.removeIf(stored::contains);
            if (fresh.isEmpty()) {
                return fresh;
            }
            all = new ArrayList<>(existing);
            all.addAll(fresh);
        }
        ColumnBlock.Encoded block = ColumnBlock.encode(all);
        Files.createDirectories(seg.getParent());
        AtomicFiles.writeFrame(seg, CompressedFrame.pack(block.raw(), codec));
        ByteBuffer written = AtomicFiles.readFrame(seg);
        if (written == null || !Arrays.equals(CompressedFrame.unpack(written), block.raw())) {
            throw new IOException("closed segment failed verification");
        }
        synchronized (blocks) {
            blocks.remove(seg);
        }
        SegmentIndex index = SegmentIndex.of(block.entries(), block.raw().length);
        AtomicFiles.writeFrame(idx, index.encode());
        indexes.put(idx, index);
        return fresh;
    }

    /** Rows of {@code key} with {@code from <= at < to}, in time order. */
    List<Row> rows(int key, long from, long to) {
        List<Row> out = new ArrayList<>();
        for (Path idx : indexFiles(from, to)) {
            SegmentIndex index = index(idx);
            if (index == null || !index.overlaps(from, to)) {
                continue;
            }
            index.entry(key).filter(e -> e.minTime() < to && e.maxTime() >= from).ifPresent(entry -> {
                byte[] raw = block(idx, index);
                if (raw != null) {
                    for (Row r : ColumnBlock.decode(raw, entry)) {
                        if (r.at() >= from && r.at() < to) {
                            out.add(r);
                        }
                    }
                }
            });
        }
        out.sort((a, b) -> Long.compare(a.at(), b.at()));
        return out;
    }

    /** Every row of one closed hour (rollup rebuild); empty when missing or damaged. */
    List<Row> hour(long hourStart) {
        Path idx = layout.index(stream, hourStart);
        SegmentIndex index = Files.exists(idx) ? index(idx) : null;
        if (index == null) {
            return List.of();
        }
        byte[] raw = block(idx, index);
        List<Row> rows = new ArrayList<>();
        if (raw != null) {
            index.entries().forEach(e -> rows.addAll(ColumnBlock.decode(raw, e)));
        }
        return rows;
    }

    /** Hour starts of the closed segments of one day. */
    List<Long> closedHours(LocalDate day) throws IOException {
        List<Long> hours = new ArrayList<>();
        for (Path file : HistoryLayout.list(layout.stream(stream).resolve(day.toString()))) {
            if (file.getFileName().toString().endsWith(".idx")) {
                HistoryLayout.hourOf(file).ifPresent(hours::add);
            }
        }
        return hours;
    }

    void forgetDay(Path dayDir) {
        indexes.keySet().removeIf(p -> p.startsWith(dayDir));
        synchronized (blocks) {
            blocks.keySet().removeIf(p -> p.startsWith(dayDir));
        }
    }

    private List<Path> indexFiles(long from, long to) {
        List<Path> files = new ArrayList<>();
        LocalDate last = HistoryLayout.day(to + HistoryLayout.HOUR);
        try {
            for (LocalDate d : HistoryLayout.storedDays(layout.stream(stream), HistoryLayout.day(from), last)) {
                for (Path file : HistoryLayout.list(layout.stream(stream).resolve(d.toString()))) {
                    if (file.getFileName().toString().endsWith(".idx")) {
                        files.add(file);
                    }
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return files;
    }

    private SegmentIndex index(Path idx) {
        SegmentIndex cached = indexes.get(idx);
        if (cached != null) {
            return cached;
        }
        try {
            ByteBuffer frame = AtomicFiles.readFrame(idx);
            if (frame == null) {
                throw new CorruptDataException("empty index");
            }
            SegmentIndex index = SegmentIndex.decode(frame);
            indexes.put(idx, index);
            return index;
        } catch (IOException | CorruptDataException e) {
            quarantine(idx);
            return null;
        }
    }

    private byte[] block(Path idx, SegmentIndex index) {
        Path seg = idx.resolveSibling(idx.getFileName().toString().replace(".idx", ".seg"));
        synchronized (blocks) {
            byte[] cached = blocks.get(seg);
            if (cached != null) {
                return cached;
            }
        }
        try {
            ByteBuffer frame = AtomicFiles.readFrame(seg);
            if (frame == null) {
                throw new CorruptDataException("empty segment");
            }
            byte[] raw = CompressedFrame.unpack(frame);
            if (raw.length != index.rawLength()) {
                throw new CorruptDataException("segment does not match its index");
            }
            synchronized (blocks) {
                blocks.put(seg, raw);
            }
            return raw;
        } catch (IOException | CorruptDataException e) {
            quarantine(idx);
            return null;
        }
    }

    private void quarantine(Path idx) {
        String base = idx.getFileName().toString().replace(".idx", "");
        for (String ext : List.of(".idx", ".seg")) {
            Path file = idx.resolveSibling(base + ext);
            try {
                if (Files.exists(file)) {
                    AtomicFiles.move(file, file.resolveSibling(file.getFileName() + BAD));
                }
            } catch (IOException ignored) {
                // Left in place; it will be retried on the next read and purged with its day.
            }
        }
        indexes.remove(idx);
        warnings.accept("history segment quarantined: " + stream + "/" + idx.getParent().getFileName() + "/" + base);
    }
}
