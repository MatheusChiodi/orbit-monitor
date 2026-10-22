package io.orbit.workspace;

import io.orbit.common.MonitorState;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidationException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * CORE-07: workspaces per company/environment (Production, Staging), each listing its groups
 * ({@code orbit.workspaces.json}). A group belongs to at most one workspace.
 */
public class WorkspaceService {

    private static final Pattern ID = Pattern.compile("[a-z][a-z0-9_-]{1,63}");

    public record Workspace(String id, String name, List<String> groupIds) implements ConfigItem {
        public Workspace {
            groupIds = groupIds == null ? List.of() : List.copyOf(groupIds);
        }
    }

    private final ConfigFile<Workspace> file;

    public WorkspaceService(ConfigFile<Workspace> file) {
        this.file = file;
    }

    /** Creates or replaces a workspace; {@code operator} is required like every config change. */
    public synchronized Workspace save(Workspace workspace, String operator) {
        if (operator == null || operator.isBlank()) {
            throw new IllegalArgumentException("Operator name required");
        }
        List<Workspace> items = new ArrayList<>(file.items().stream()
                .filter(w -> !w.id().equals(workspace.id())).toList());
        items.add(workspace);
        List<String> errors = validate(items);
        if (!errors.isEmpty()) {
            throw new ConfigValidationException(errors);
        }
        file.save(items);
        return workspace;
    }

    public synchronized boolean delete(String id) {
        List<Workspace> remaining = file.items().stream().filter(w -> !w.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }

    public List<Workspace> list() {
        return file.items().stream().sorted(Comparator.comparing(Workspace::name, Comparator.nullsLast(
                Comparator.naturalOrder()))).toList();
    }

    public Optional<Workspace> workspaceOf(String groupId) {
        return file.items().stream().filter(w -> w.groupIds().contains(groupId)).findFirst();
    }

    /** Worst member state, ignoring members in a maintenance window. */
    public static MonitorState groupState(List<String> monitorIds, Function<String, MonitorState> stateLookup,
                                          Set<String> inMaintenance) {
        return MonitorState.worstOf(monitorIds.stream().filter(id -> !inMaintenance.contains(id))
                .map(stateLookup).filter(Objects::nonNull).toList());
    }

    static List<String> validate(List<Workspace> workspaces) {
        List<String> errors = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (Workspace w : workspaces) {
            if (w.id() == null || !ID.matcher(w.id()).matches()) {
                errors.add(w.id() + ": id must be lower-case letters, digits, '_' or '-'");
            }
            if (w.name() == null || w.name().isBlank()) {
                errors.add(w.id() + ": name is required");
            }
            for (String group : w.groupIds()) {
                if (!seen.add(group)) {
                    errors.add(w.id() + ": group " + group + " already belongs to another workspace");
                }
            }
        }
        return errors;
    }
}
