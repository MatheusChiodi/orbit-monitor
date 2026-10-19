package io.orbit.workspace;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/** CORE-07: workspaces per company/environment (Production, Staging), each listing its groups. */
public class WorkspaceService {

    public record Workspace(String id, String name, List<String> groupIds) implements ConfigItem {
    }

    public WorkspaceService(ConfigFile<Workspace> file) {
    }

    public Workspace save(Workspace workspace, String operator) {
        throw new UnsupportedOperationException("CORE-07 workspaces are not implemented yet");
    }

    public List<Workspace> list() {
        throw new UnsupportedOperationException("CORE-07 workspaces are not implemented yet");
    }

    public Optional<Workspace> workspaceOf(String groupId) {
        throw new UnsupportedOperationException("CORE-07 workspaces are not implemented yet");
    }

    /** Worst member state, ignoring members in a maintenance window. */
    public static MonitorState groupState(List<String> monitorIds, Function<String, MonitorState> stateLookup,
                                          Set<String> inMaintenance) {
        throw new UnsupportedOperationException("CORE-07 maintenance-aware group state is not implemented yet");
    }
}
