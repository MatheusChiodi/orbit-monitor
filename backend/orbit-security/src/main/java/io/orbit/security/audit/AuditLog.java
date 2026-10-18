package io.orbit.security.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.OperatorName;
import io.orbit.common.privacy.SensitiveDataRedactor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Audit trail of every mutation and preview execution: kept in memory for a window (24 h) and
 * written as one masked JSON line per entry to the {@code orbit.audit} log.
 */
public class AuditLog {

    public static final String UNKNOWN_OPERATOR = "unknown";
    public static final String ANONYMIZED = "anonymized";
    private static final Logger LOG = LoggerFactory.getLogger("orbit.audit");

    private final SensitiveDataRedactor redactor;
    private final Clock clock;
    private final Duration window;
    private final Consumer<String> sink;
    private final ObjectMapper json = new ObjectMapper();
    private final Deque<AuditEntry> entries = new ArrayDeque<>();

    public AuditLog(SensitiveDataRedactor redactor, Clock clock, Duration window, Consumer<String> sink) {
        this.redactor = redactor;
        this.clock = clock;
        this.window = window;
        this.sink = sink;
    }

    public AuditLog(SensitiveDataRedactor redactor, Clock clock) {
        this(redactor, clock, Duration.ofHours(24), LOG::info);
    }

    Clock clock() {
        return clock;
    }

    public synchronized AuditEntry record(String operator, String action, String target, String detail,
                                          String remoteAddress) {
        AuditEntry entry = new AuditEntry(clock.instant(), operatorName(operator), action, target,
                redactor.redactText(detail), remoteAddress);
        entries.addFirst(entry);
        evict();
        sink.accept(toJson(entry));
        return entry;
    }

    /** Entries in the window, newest first. */
    public synchronized List<AuditEntry> recent() {
        evict();
        return List.copyOf(entries);
    }

    public List<AuditEntry> query(AuditQuery query) {
        return recent().stream()
                .filter(e -> query.actionPrefix() == null || e.action().startsWith(query.actionPrefix()))
                .filter(e -> query.target() == null || query.target().equals(e.target()))
                .filter(e -> query.operator() == null || e.operator().toLowerCase(Locale.ROOT)
                        .contains(query.operator().toLowerCase(Locale.ROOT)))
                .toList();
    }

    /** LGPD art. 18: replaces an operator name in every entry still in memory; returns how many changed. */
    public synchronized int anonymize(String operator) {
        String name = OperatorName.normalize(operator);
        int changed = 0;
        Deque<AuditEntry> updated = new ArrayDeque<>(entries.size());
        for (AuditEntry e : entries) {
            if (e.operator().equals(name)) {
                updated.addLast(e.withOperator(ANONYMIZED));
                changed++;
            } else {
                updated.addLast(e);
            }
        }
        entries.clear();
        entries.addAll(updated);
        return changed;
    }

    private void evict() {
        Instant cutoff = clock.instant().minus(window);
        while (!entries.isEmpty() && entries.peekLast().at().isBefore(cutoff)) {
            entries.removeLast();
        }
    }

    private static String operatorName(String raw) {
        try {
            return OperatorName.normalize(raw);
        } catch (IllegalArgumentException e) {
            return UNKNOWN_OPERATOR;
        }
    }

    private String toJson(AuditEntry entry) {
        Map<String, Object> line = new LinkedHashMap<>();
        line.put("at", entry.at().toString());
        line.put("operator", entry.operator());
        line.put("action", entry.action());
        line.put("target", entry.target());
        line.put("detail", entry.detail());
        line.put("remote", entry.remoteAddress());
        try {
            return json.writeValueAsString(line);
        } catch (JsonProcessingException e) {
            return "{\"action\":\"" + entry.action() + "\"}";
        }
    }
}
