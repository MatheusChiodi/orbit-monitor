package io.orbit.api.wall;

import com.fasterxml.jackson.annotation.JsonInclude;

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

    /** FE-10: workspace name and logo (sanitized inline SVG) from orbit.settings.json. */
    public record BrandingView(String name, String logoSvg) {
    }

    /**
     * @param uptime24h availability in percentage points over the history in memory (99.97)
     * @param branding  null when the workspace has no branding (omitted from the JSON)
     */
    public record WallSnapshot(Instant generatedAt, String environment, List<GroupView> groups,
                               List<MonitorView> monitors, List<IncidentView> incidents,
                               List<TimelineEventView> timeline, double uptime24h, Instant lastRecoveryAt,
                               @JsonInclude(JsonInclude.Include.NON_NULL) BrandingView branding) {

        public WallSnapshot(Instant generatedAt, String environment, List<GroupView> groups, List<MonitorView> monitors,
                            List<IncidentView> incidents, List<TimelineEventView> timeline, double uptime24h,
                            Instant lastRecoveryAt) {
            this(generatedAt, environment, groups, monitors, incidents, timeline, uptime24h, lastRecoveryAt, null);
        }
    }

    /**
     * @param type   snapshot, monitor, incident or event
     * @param seq    increasing sequence number so clients can detect gaps; a snapshot is the state as of
     *               its seq (the next delta is seq + 1)
     * @param stream id of this server run; reconnect with {@code ?stream=..&since=<seq>} to resume (BE-38)
     */
    public record WallMessage(String type, long seq, String stream, Object payload) {
    }
}
