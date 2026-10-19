package io.orbit.history.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.history.AuditRecord;
import io.orbit.history.HistoryBucket;
import io.orbit.history.HistoryCoverage;
import io.orbit.history.HistoryEvent;
import io.orbit.history.HistoryHealth;
import io.orbit.history.HistorySample;
import io.orbit.history.HistorySettings;
import io.orbit.history.HistorySummary;
import io.orbit.history.codec.Compression;
import io.orbit.history.codec.FilePermissions;
import io.orbit.history.rollup.Resolution;
import io.orbit.history.rollup.Rollup;
import io.orbit.history.segment.Row;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.function.LongSupplier;

/**
 * The 30-day history store (CORE-22): non-blocking writes through one writer thread, crash recovery
 * on open, daily retention with disk limits, and index/rollup driven reads.
 */
public final class HistoryStore implements AutoCloseable {

    private static final Logger LOG = LoggerFactory.getLogger(HistoryStore.class);
    static final String HEARTBEATS = "heartbeats";
    static final String SERIES = "series";
    static final String EVENTS = "events";
    static final String AUDIT = "audit";
    private static final int QUEUE_CAPACITY = 1_000_000;
    private static final long RETENTION_EVERY_MS = 10 * 60_000L;
    private static final int KEPT_WARNINGS = 20;

    /** Marks a sample for the series stream on the queue. */
    private record SeriesPoint(HistorySample sample) {
    }

    private final HistorySettings settings;
    private final Clock clock;
    private final LongSupplier freeSpace;
    private final SensitiveDataRedactor redactor = new SensitiveDataRedactor();
    private final Dictionary dictionary;
    private final SampleStream heartbeats;
    private final SampleStream series;
    private final DayLog<HistoryEvent> events;
    private final DayLog<AuditRecord> audit;
    private final Retention retention;
    private final HistoryWriter writer;
    private final Deque<String> warnings = new ArrayDeque<>();
    private volatile boolean rawEnabled = true;
    private volatile boolean capExceeded;
    private long lastRetention = -1;

    private HistoryStore(HistorySettings settings, Clock clock, LongSupplier freeSpace) throws IOException {
        this.settings = settings;
        this.clock = clock;
        this.freeSpace = freeSpace;
        HistoryLayout layout = new HistoryLayout(settings.dataDir());
        Files.createDirectories(layout.root());
        FilePermissions.ownerOnly(layout.root());
        Compression codec = Compression.preferred();
        if (codec != Compression.ZSTD) {
            warn("zstd native library unavailable; history blocks use Deflate");
        }
        long now = clock.millis();
        this.dictionary = Dictionary.open(layout.dictionary());
        this.heartbeats = SampleStream.open(layout, HEARTBEATS, codec, now, this::warn);
        this.series = SampleStream.open(layout, SERIES, codec, now, this::warn);
        ObjectMapper json = new ObjectMapper().registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.events = new DayLog<>(layout, EVENTS, HistoryEvent.class, HistoryEvent::at, json);
        this.audit = new DayLog<>(layout, AUDIT, AuditRecord.class, AuditRecord::at, json);
        this.retention = new Retention(layout, settings, List.of(HEARTBEATS, SERIES), List.of(EVENTS, AUDIT),
                (dir, day) -> {
                    heartbeats.forgetDay(dir, day);
                    series.forgetDay(dir, day);
                });
        this.writer = new HistoryWriter(new Sink(), clock, QUEUE_CAPACITY, this::warn);
        maintain(now);
    }

    public static HistoryStore open(HistorySettings settings, Clock clock) throws IOException {
        return open(settings, clock, () -> usableSpace(settings));
    }

    /** Opens the store, recovers from a crash and starts the writer thread. */
    public static HistoryStore open(HistorySettings settings, Clock clock, LongSupplier freeSpace)
            throws IOException {
        HistoryStore store = new HistoryStore(settings, clock, freeSpace);
        store.writer.start();
        return store;
    }

    // ---- writes (never block) ----

    public boolean record(HistorySample heartbeat) {
        return writer.offer(Objects.requireNonNull(heartbeat));
    }

    public boolean recordSeries(HistorySample point) {
        return writer.offer(new SeriesPoint(Objects.requireNonNull(point)));
    }

    public boolean record(HistoryEvent event) {
        return writer.offer(new HistoryEvent(event.at(), event.type(), event.monitorId(), event.actor(),
                redact(event.detail())));
    }

    public boolean record(AuditRecord entry) {
        return writer.offer(new AuditRecord(entry.at(), entry.actor(), entry.action(), entry.entity(),
                redact(entry.detail())));
    }

    /** Completes when everything recorded so far is on disk. */
    public CompletableFuture<Void> flush() {
        return writer.flush();
    }

    // ---- reads ----

    public List<HistorySample> raw(String key, Instant from, Instant to) {
        return raw(heartbeats, key, from, to);
    }

    public List<HistorySample> rawSeries(String key, Instant from, Instant to) {
        return raw(series, key, from, to);
    }

    public List<HistoryBucket> buckets(String key, Instant from, Instant to, Resolution resolution) {
        return buckets(heartbeats, key, from, to, resolution);
    }

    public List<HistoryBucket> seriesBuckets(String key, Instant from, Instant to, Resolution resolution) {
        return buckets(series, key, from, to, resolution);
    }

    /** Uptime and percentiles: hourly rollups for whole hours, raw rows for the partial edges. */
    public HistorySummary summary(String key, Instant from, Instant to) {
        Optional<Integer> id = dictionary.findKey(key);
        long f = from.toEpochMilli();
        long t = to.toEpochMilli();
        Rollup total = new Rollup(-1, f, true);
        if (id.isPresent() && t > f) {
            long firstFull = Math.min(t, Math.ceilDiv(f, HistoryLayout.HOUR) * HistoryLayout.HOUR);
            long lastFull = Math.max(firstFull, HistoryLayout.hourStart(t));
            heartbeats.rows(id.get(), f, firstFull).forEach(total::add);
            heartbeats.rollups(Resolution.HOUR, id.get(), firstFull, lastFull).forEach(total::merge);
            heartbeats.rows(id.get(), lastFull, t).forEach(total::add);
        }
        long counted = total.count() - total.stateCount(Row.UNKNOWN);
        long up = total.stateCount(Row.OK) + total.stateCount(Row.WARN);
        return new HistorySummary(from, to, total.count(), total.stateCount(Row.DOWN),
                counted == 0 ? null : 100.0 * up / counted, quantile(total, 0.5), quantile(total, 0.95),
                quantile(total, 0.99));
    }

    public List<HistoryEvent> events(Instant from, Instant to, String type, String monitorId, int limit) {
        return events.query(from, to, e -> (type == null || type.equals(e.type()))
                && (monitorId == null || monitorId.equals(e.monitorId())), limit);
    }

    public List<AuditRecord> audit(Instant from, Instant to, String actor, String entity, int limit) {
        return audit.query(from, to, a -> (actor == null || actor.equals(a.actor()))
                && (entity == null || entity.equals(a.entity())), limit);
    }

    public HistoryCoverage coverage() {
        Instant now = clock.instant();
        LocalDate oldest;
        try {
            oldest = heartbeats.oldestDay();
        } catch (IOException e) {
            oldest = null;
        }
        Instant floor = now.minusMillis(settings.retentionDays() * HistoryLayout.DAY);
        Instant start = oldest == null ? null : Instant.ofEpochMilli(HistoryLayout.dayStart(oldest));
        if (start != null && start.isBefore(floor)) {
            start = floor;
        }
        return new HistoryCoverage(start, now, settings.retentionDays(), rawEnabled);
    }

    public HistoryHealth health() {
        long bytes;
        try {
            bytes = retention.size();
        } catch (IOException e) {
            bytes = -1;
        }
        synchronized (warnings) {
            return new HistoryHealth(rawEnabled, capExceeded, writer.dropped(), bytes, new ArrayList<>(warnings));
        }
    }

    @Override
    public void close() throws Exception {
        writer.close();
        heartbeats.close();
        series.close();
        events.close();
        audit.close();
    }

    // ---- internals ----

    private List<HistorySample> raw(SampleStream stream, String key, Instant from, Instant to) {
        Optional<Integer> id = dictionary.findKey(key);
        if (id.isEmpty()) {
            return List.of();
        }
        List<HistorySample> out = new ArrayList<>();
        for (Row r : stream.rows(id.get(), from.toEpochMilli(), to.toEpochMilli())) {
            out.add(new HistorySample(key, Instant.ofEpochMilli(r.at()), MonitorState.values()[r.state()],
                    r.latencyMs(), r.hasValue() ? r.value() : null, dictionary.error(r.error())));
        }
        return out;
    }

    private List<HistoryBucket> buckets(SampleStream stream, String key, Instant from, Instant to,
                                        Resolution resolution) {
        if (resolution == Resolution.RAW) {
            throw new IllegalArgumentException("raw data has no buckets; use raw()");
        }
        Optional<Integer> id = dictionary.findKey(key);
        if (id.isEmpty()) {
            return List.of();
        }
        long f = resolution.bucketStart(from.toEpochMilli());
        List<HistoryBucket> out = new ArrayList<>();
        for (Rollup r : stream.rollups(resolution, id.get(), f, to.toEpochMilli())) {
            boolean lat = r.latencyCount() > 0;
            boolean val = r.valueCount() > 0;
            out.add(new HistoryBucket(Instant.ofEpochMilli(r.start()), r.count(), r.stateCount(Row.OK),
                    r.stateCount(Row.WARN), r.stateCount(Row.DOWN), r.stateCount(Row.UNKNOWN),
                    lat ? r.latencyMin() : null, lat ? r.latencyMax() : null, lat ? r.latencyMean() : null,
                    lat && r.sketch() != null ? quantile(r, 0.95) : null,
                    val ? r.valueMin() : null, val ? r.valueMax() : null, val ? r.valueMean() : null));
        }
        return out;
    }

    private static Long quantile(Rollup r, double q) {
        double v = r.sketch() == null ? Double.NaN : r.sketch().quantile(q);
        return Double.isNaN(v) ? null : (long) v;
    }

    private String redact(String text) {
        return text == null ? null : redactor.redactText(text);
    }

    private void maintain(long now) throws IOException {
        if (lastRetention >= 0 && now - lastRetention < RETENTION_EVERY_MS
                && HistoryLayout.day(now).equals(HistoryLayout.day(lastRetention))) {
            return;
        }
        lastRetention = now;
        Retention.Outcome outcome = retention.run(HistoryLayout.day(now), freeSpace.getAsLong());
        capExceeded = outcome.capExceeded();
        if (outcome.capExceeded()) {
            warn("history exceeded history.maxDiskMb; oldest days dropped: " + outcome.purged());
        }
        boolean enable = !outcome.lowDisk();
        if (enable != rawEnabled) {
            warn(enable ? "free disk space recovered; raw history writes resumed"
                    : "free disk space below history.minFreeDiskMb; raw history writes stopped, rollups kept");
        }
        rawEnabled = enable;
        heartbeats.rawEnabled(enable);
        series.rawEnabled(enable);
    }

    private void warn(String message) {
        LOG.warn(message);
        synchronized (warnings) {
            warnings.addLast(message);
            while (warnings.size() > KEPT_WARNINGS) {
                warnings.removeFirst();
            }
        }
    }

    private static long usableSpace(HistorySettings settings) {
        try {
            return Files.getFileStore(settings.dataDir()).getUsableSpace();
        } catch (IOException e) {
            return Long.MAX_VALUE;
        }
    }

    /** Writer-thread side: converts queued records and writes one frame per stream per flush. */
    private final class Sink implements HistoryWriter.Sink {

        @Override
        public void write(List<Object> batch) throws IOException {
            List<Row> beats = new ArrayList<>();
            List<Row> points = new ArrayList<>();
            List<HistoryEvent> eventBatch = new ArrayList<>();
            List<AuditRecord> auditBatch = new ArrayList<>();
            for (Object item : batch) {
                switch (item) {
                    case HistorySample s -> beats.add(row(s));
                    case SeriesPoint p -> points.add(row(p.sample()));
                    case HistoryEvent e -> eventBatch.add(e);
                    case AuditRecord a -> auditBatch.add(a);
                    default -> throw new IllegalStateException("unexpected record");
                }
            }
            heartbeats.append(beats);
            series.append(points);
            events.append(eventBatch);
            audit.append(auditBatch);
            heartbeats.force();
            series.force();
            events.force();
            audit.force();
        }

        @Override
        public void tick(long nowMillis) throws IOException {
            heartbeats.roll(nowMillis);
            series.roll(nowMillis);
            maintain(nowMillis);
        }

        private Row row(HistorySample s) throws IOException {
            return new Row(dictionary.keyId(s.key()), s.at().toEpochMilli(), s.state().ordinal(),
                    (int) s.latencyMs(), s.value() == null ? Double.NaN : s.value(), dictionary.errorId(s.error()));
        }
    }
}
