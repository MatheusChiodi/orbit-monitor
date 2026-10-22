package io.orbit.api.web;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.history.AuditRecord;
import io.orbit.history.HistoryBucket;
import io.orbit.history.HistoryCoverage;
import io.orbit.history.HistoryEvent;
import io.orbit.history.HistoryHealth;
import io.orbit.history.HistorySample;
import io.orbit.history.HistorySummary;
import io.orbit.history.rollup.Resolution;
import io.orbit.history.store.HistoryStore;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * BE-52: history, events and audit read from the 30-day store. The resolution is picked from the
 * span unless asked (≤ 6 h raw, ≤ 7 d 1-minute, otherwise 1-hour); exports stream and redact again.
 */
@RestController
public class HistoryController {

    /** Raw samples or rollup buckets of one monitor, with the period the store covers. */
    public record HistoryResponse(String monitorId, Instant from, Instant to, String resolution,
                                  HistoryCoverage coverage, List<HistorySample> samples,
                                  List<HistoryBucket> buckets) {
    }

    /** Series of one field ({@code monitorId/field}); {@code field} is a column or a JSONPath. */
    public record SeriesResponse(String monitorId, String field, Instant from, Instant to, String resolution,
                                 List<HistorySample> samples, List<HistoryBucket> buckets) {
    }

    /**
     * CORE-20: what the store covers, with a label for the console ("History available: last 30 days").
     *
     * @param coveredDays days between the oldest record and now, capped by the retention
     */
    public record CoverageView(Instant oldest, Instant newest, int retentionDays, boolean rawWritesEnabled,
                               int coveredDays, String label) {
    }

    static final Duration MAX_SPAN = Duration.ofDays(31);
    static final int MAX_RECORDS = 10_000;
    private static final Duration DEFAULT_SPAN = Duration.ofHours(24);

    private final HistoryStore store;
    private final Clock clock;
    private final ObjectMapper json;
    private final SensitiveDataRedactor redactor;
    private final Messages messages;

    public HistoryController(HistoryStore store, Clock clock, ObjectMapper json, SensitiveDataRedactor redactor,
                             Messages messages) {
        this.messages = messages;
        this.store = store;
        this.clock = clock;
        this.json = json;
        this.redactor = redactor;
    }

    @GetMapping("/api/history/{monitorId}")
    public HistoryResponse history(@PathVariable String monitorId, @RequestParam(required = false) String from,
                                   @RequestParam(required = false) String to,
                                   @RequestParam(required = false) String resolution) {
        Instant[] range = range(from, to);
        Resolution res = Resolution.parse(resolution, range[0].toEpochMilli(), range[1].toEpochMilli());
        if (res == Resolution.RAW) {
            return new HistoryResponse(monitorId, range[0], range[1], res.label(), store.coverage(),
                    store.raw(monitorId, range[0], range[1]), null);
        }
        return new HistoryResponse(monitorId, range[0], range[1], res.label(), store.coverage(), null,
                store.buckets(monitorId, range[0], range[1], res));
    }

    /** BE-19/BE-23: a field kept as series (SQL column, JSONPath, Kafka lag, days left). */
    @GetMapping("/api/history/{monitorId}/series")
    public SeriesResponse series(@PathVariable String monitorId, @RequestParam String field,
                                 @RequestParam(required = false) String from, @RequestParam(required = false) String to,
                                 @RequestParam(required = false) String resolution) {
        Instant[] range = range(from, to);
        Resolution res = Resolution.parse(resolution, range[0].toEpochMilli(), range[1].toEpochMilli());
        String key = HistorySample.seriesKey(monitorId, field);
        if (res == Resolution.RAW) {
            return new SeriesResponse(monitorId, field, range[0], range[1], res.label(),
                    store.rawSeries(key, range[0], range[1]), null);
        }
        return new SeriesResponse(monitorId, field, range[0], range[1], res.label(), null,
                store.seriesBuckets(key, range[0], range[1], res));
    }

    @GetMapping("/api/history/{monitorId}/summary")
    public HistorySummary summary(@PathVariable String monitorId, @RequestParam(required = false) String from,
                                  @RequestParam(required = false) String to) {
        Instant[] range = range(from, to);
        return store.summary(monitorId, range[0], range[1]);
    }

    /** Streams raw samples as CSV or JSON Lines; error codes are redacted again on the way out. */
    @GetMapping("/api/history/{monitorId}/export")
    public ResponseEntity<StreamingResponseBody> export(@PathVariable String monitorId,
                                                        @RequestParam(required = false) String from,
                                                        @RequestParam(required = false) String to,
                                                        @RequestParam(defaultValue = "csv") String format) {
        Instant[] range = range(from, to);
        boolean csv = switch (format) {
            case "csv" -> true;
            case "json" -> false;
            default -> throw new IllegalArgumentException("format must be csv or json");
        };
        List<HistorySample> samples = store.raw(monitorId, range[0], range[1]);
        StreamingResponseBody body = out -> {
            Writer writer = new OutputStreamWriter(out, StandardCharsets.UTF_8);
            if (csv) {
                writer.write("at,state,latencyMs,value,error\n");
                for (HistorySample s : samples) {
                    writer.write(s.at() + "," + s.state() + "," + s.latencyMs() + ","
                            + (s.value() == null ? "" : s.value()) + "," + csvSafe(s.error()) + "\n");
                }
            } else {
                JsonGenerator gen = json.getFactory().createGenerator(writer);
                for (HistorySample s : samples) {
                    json.writeValue(gen, new HistorySample(s.key(), s.at(), s.state(), s.latencyMs(), s.value(),
                            s.error() == null ? null : redactor.redactText(s.error())));
                    gen.writeRaw('\n');
                }
                gen.flush();
            }
            writer.flush();
        };
        String file = "orbit-history-" + monitorId.replaceAll("[^A-Za-z0-9_-]", "_") + (csv ? ".csv" : ".jsonl");
        return ResponseEntity.ok()
                .contentType(csv ? new MediaType("text", "csv", StandardCharsets.UTF_8)
                        : MediaType.parseMediaType("application/x-ndjson"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file + "\"")
                .body(body);
    }

    @GetMapping("/api/history/coverage")
    public CoverageView coverage() {
        HistoryCoverage c = store.coverage();
        if (c.oldest() == null) {
            return new CoverageView(null, null, c.retentionDays(), c.rawWritesEnabled(), 0,
                    messages.current("history.coverage.empty"));
        }
        long days = Duration.between(c.oldest(), clock.instant()).toDays() + 1;
        int covered = (int) Math.max(1, Math.min(c.retentionDays(), days));
        return new CoverageView(c.oldest(), c.newest(), c.retentionDays(), c.rawWritesEnabled(), covered,
                messages.current("history.coverage.days", covered));
    }

    @GetMapping("/api/history/health")
    public HistoryHealth health() {
        return store.health();
    }

    @GetMapping("/api/events")
    public List<HistoryEvent> events(@RequestParam(required = false) String from,
                                     @RequestParam(required = false) String to,
                                     @RequestParam(required = false) String type,
                                     @RequestParam(required = false) String monitorId,
                                     @RequestParam(defaultValue = "1000") int limit) {
        Instant[] range = range(from, to);
        return store.events(range[0], range[1], type, monitorId, Math.min(Math.max(limit, 1), MAX_RECORDS));
    }

    /** Audit trail on disk (30 days); the in-memory view stays at {@code /api/audit}. */
    @GetMapping("/api/history/audit")
    public List<AuditRecord> audit(@RequestParam(required = false) String from,
                                   @RequestParam(required = false) String to,
                                   @RequestParam(required = false) String actor,
                                   @RequestParam(required = false) String entity,
                                   @RequestParam(defaultValue = "1000") int limit) {
        Instant[] range = range(from, to);
        return store.audit(range[0], range[1], actor, entity, Math.min(Math.max(limit, 1), MAX_RECORDS));
    }

    private Instant[] range(String from, String to) {
        Instant end = to == null || to.isBlank() ? clock.instant() : parse(to, "to");
        Instant start = from == null || from.isBlank() ? end.minus(DEFAULT_SPAN) : parse(from, "from");
        if (!start.isBefore(end)) {
            throw new IllegalArgumentException("from must be before to");
        }
        if (Duration.between(start, end).compareTo(MAX_SPAN) > 0) {
            throw new IllegalArgumentException("the period is limited to 31 days");
        }
        return new Instant[] {start, end};
    }

    private static Instant parse(String value, String name) {
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(name + " must be an ISO-8601 instant");
        }
    }

    private String csvSafe(String error) {
        if (error == null) {
            return "";
        }
        String clean = redactor.redactText(error).replaceAll("[\\r\\n,\"]", " ");
        return clean.matches("^[=+\\-@].*") ? "'" + clean : clean;
    }
}
