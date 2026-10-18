package io.orbit.api.wall;

import java.time.Instant;
import java.util.List;

/**
 * Wall contract shared with the frontend ({@code frontend/src/shared/api/types.ts}): snapshot plus
 * deltas over {@code /ws/wall}. Everything here is already masked; no personal data reaches the wall.
 */
public final class WallViews {

    private WallViews() {
    }

    /** Main rule shown on the wall ({@code PENDING_QTY < 200}). */
    public record RuleView(String field, String operator, double limit) {
    }

    /**
     * @param status OK, WARN, DOWN or UNKNOWN (no check finished yet)
     * @param value  current primary value; null when there is no answer
     * @param series last 60 points (1 per minute), null gaps
     */
    public record MonitorView(String id, String name, String groupId, String type, String status, Double value,
                              String unit, RuleView rule, Instant since, List<Double> series, Instant lastCheckAt,
                              String error) {
    }

    public record GroupView(String id, String name, String color, String status) {
    }

    public record IncidentView(String id, String monitorId, String severity, Instant openedAt, String acknowledgedBy,
                               Instant acknowledgedAt, List<String> impact, Instant escalatesAt) {
    }

    /** @param kind DOWN, WARN, OK, ACK or INFO */
    public record TimelineEventView(String id, Instant at, String kind, String title, String detail) {
    }

    /** @param uptime24h availability in percentage points over the history in memory (99.97) */
    public record WallSnapshot(Instant generatedAt, String environment, List<GroupView> groups,
                               List<MonitorView> monitors, List<IncidentView> incidents,
                               List<TimelineEventView> timeline, double uptime24h, Instant lastRecoveryAt) {
    }

    /**
     * @param type snapshot, monitor, incident or event
     * @param seq  increasing sequence number so clients can detect gaps and ask for a new snapshot
     */
    public record WallMessage(String type, long seq, Object payload) {
    }
}
