package io.orbit.workspace.status;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigItem;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * BE-42: read-only status page built from chosen groups (orbit.status-pages.json): group name,
 * state and uptime only. No monitor values, error texts, operator names or personal data.
 */
public final class StatusPageBuilder {

    /** @param pub public (anyone on the network) or internal (console only) */
    public record StatusPage(String id, String slug, String title, List<String> groupIds, boolean pub)
            implements ConfigItem {
        public StatusPage {
            groupIds = groupIds == null ? List.of() : List.copyOf(groupIds);
        }
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

    /**
     * Groups in the page's order; a group without data is left out (its internal id is never shown)
     * and the overall state is the worst listed state, UNKNOWN when nothing is known yet.
     */
    public static View build(StatusPage page, Map<String, GroupInput> groups, Instant now) {
        List<GroupStatus> listed = new ArrayList<>();
        List<MonitorState> states = new ArrayList<>();
        for (String id : page.groupIds()) {
            GroupInput input = groups.get(id);
            if (input == null) {
                continue;
            }
            MonitorState state = input.state() == null ? MonitorState.UNKNOWN : input.state();
            states.add(state);
            listed.add(new GroupStatus(input.name(), state.name(), round(input.uptimePercent())));
        }
        return new View(page.title(), MonitorState.worstOf(states).name(), List.copyOf(listed), now);
    }

    private static Double round(Double percent) {
        return percent == null ? null : Math.round(percent * 100.0) / 100.0;
    }
}
