package io.orbit.api.runtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.history.AuditRecord;
import io.orbit.history.store.HistoryStore;

import java.io.IOException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.function.Consumer;

/**
 * BE-52: sends every audit line (already masked by {@code AuditLog}) to the 30-day audit trail on
 * disk, so {@code GET /api/history/audit} covers what the in-memory {@code /api/audit} forgets after 24 h.
 */
public final class AuditForwarder implements Consumer<String> {

    private static final ObjectMapper JSON = new ObjectMapper();
    private final HistoryStore store;

    public AuditForwarder(HistoryStore store) {
        this.store = store;
    }

    @Override
    public void accept(String line) {
        try {
            JsonNode node = JSON.readTree(line);
            store.record(new AuditRecord(Instant.parse(node.path("at").asText()), node.path("operator").asText(null),
                    node.path("action").asText(null), node.path("target").asText(null),
                    node.path("detail").asText(null)));
        } catch (IOException | DateTimeParseException e) {
            // never break the audited action because the history is unavailable
        }
    }
}
