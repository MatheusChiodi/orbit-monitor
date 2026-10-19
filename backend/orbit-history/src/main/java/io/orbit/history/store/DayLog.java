package io.orbit.history.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.history.codec.FramedLog;

import java.io.Closeable;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * Small append-only record stream (events, audit): one CRC-framed JSON record per frame in one file
 * per UTC day, purged with its day. Volumes are tiny, so records stay uncompressed and readable.
 */
final class DayLog<T> implements Closeable {

    private final HistoryLayout layout;
    private final String stream;
    private final Class<T> type;
    private final Function<T, Instant> time;
    private final ObjectMapper json;
    private FramedLog open;
    private LocalDate openDay;

    DayLog(HistoryLayout layout, String stream, Class<T> type, Function<T, Instant> time, ObjectMapper json) {
        this.layout = layout;
        this.stream = stream;
        this.type = type;
        this.time = time;
        this.json = json;
    }

    synchronized void append(List<T> records) throws IOException {
        for (T record : records) {
            long at = time.apply(record).toEpochMilli();
            LocalDate day = HistoryLayout.day(at);
            if (open == null || !day.equals(openDay)) {
                close();
                open = FramedLog.open(layout.dayLog(stream, at));
                openDay = day;
            }
            open.append(json.writeValueAsBytes(record));
        }
    }

    synchronized void force() throws IOException {
        if (open != null) {
            open.force();
        }
    }

    /** Records with {@code from <= at < to} that match, oldest first, at most {@code limit}. */
    List<T> query(Instant from, Instant to, Predicate<T> filter, int limit) {
        List<T> out = new ArrayList<>();
        LocalDate last = HistoryLayout.day(to.toEpochMilli());
        try {
            for (LocalDate d : HistoryLayout.storedDays(layout.stream(stream), HistoryLayout.day(from.toEpochMilli()),
                    last)) {
                if (out.size() >= limit) {
                    break;
                }
                Path file = layout.dayLog(stream, HistoryLayout.dayStart(d));
                if (!file.toFile().exists()) {
                    continue;
                }
                FramedLog.read(file, frame -> {
                    T record = decode(frame);
                    Instant at = record == null ? null : time.apply(record);
                    if (at != null && !at.isBefore(from) && at.isBefore(to) && filter.test(record)
                            && out.size() < limit) {
                        out.add(record);
                    }
                });
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        out.sort((a, b) -> time.apply(a).compareTo(time.apply(b)));
        return out;
    }

    @Override
    public synchronized void close() throws IOException {
        if (open != null) {
            open.close();
            open = null;
            openDay = null;
        }
    }

    private T decode(ByteBuffer frame) {
        byte[] bytes = new byte[frame.remaining()];
        frame.get(bytes);
        try {
            return json.readValue(bytes, type);
        } catch (IOException e) {
            return null;
        }
    }
}
