package io.orbit.workspace.status;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigItem;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * BE-42: read-only status page built from chosen groups (orbit.status-pages.json): group name,
 * state and uptime only. No monitor values, error texts, operator names or personal data.
 */
public final class StatusPageBuilder {

    public record StatusPage(String id, String slug, String title, List<String> groupIds, boolean pub)
            implements ConfigItem {
    }

    public record GroupStatus(String name, String state, Double uptimePercent) {
    }

    /** @param overall worst group state; @param generatedAt for client-side cache headers */
    public record View(String title, String overall, List<GroupStatus> groups, Instant generatedAt) {
    }

    /** What the builder needs about a group. */
    public record GroupInput(String id, String name, MonitorState state, Double uptimePercent) {
    }

    private StatusPageBuilder() {
    }

    public static View build(StatusPage page, Map<String, GroupInput> groups, Instant now) {
        throw new UnsupportedOperationException("BE-42 status page API is not implemented yet");
    }
}
