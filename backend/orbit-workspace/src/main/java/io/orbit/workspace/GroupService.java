package io.orbit.workspace;

import io.orbit.common.MonitorState;
import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigValidationException;
import io.orbit.config.ConfigValidator;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Pattern;

/** Groups CRUD over {@code orbit.groups.json} and the group state rule (worst member state). */
public class GroupService {

    private static final Pattern ID = Pattern.compile("[a-z][a-z0-9_-]{1,63}");
    private static final Pattern COLOR = Pattern.compile("#[0-9a-fA-F]{6}");

    public static final ConfigValidator<Group> VALIDATOR = groups -> {
        List<String> errors = new ArrayList<>();
        for (Group g : groups) {
            if (!ID.matcher(g.id()).matches()) {
                errors.add(g.id() + ": id must be lower-case letters, digits, '_' or '-'");
            }
            if (g.name() == null || g.name().isBlank()) {
                errors.add(g.id() + ": name is required");
            }
            if (g.color() != null && !COLOR.matcher(g.color()).matches()) {
                errors.add(g.id() + ": color must look like #3b9eff");
            }
        }
        return errors;
    };

    private final ConfigFile<Group> file;
    private final Clock clock;

    public GroupService(ConfigFile<Group> file, Clock clock) {
        this.file = file;
        this.clock = clock;
    }

    public GroupService(ConfigFile<Group> file) {
        this(file, Clock.systemUTC());
    }

    public List<Group> list() {
        return file.items().stream()
                .sorted(Comparator.comparingInt(Group::order).thenComparing(Group::name))
                .toList();
    }

    public Optional<Group> find(String id) {
        return file.items().stream().filter(g -> g.id().equals(id)).findFirst();
    }

    /** Creates or replaces the group with the same id. */
    public synchronized Group save(Group group, String operator) {
        Group stamped = group.touchedBy(OperatorName.normalize(operator), clock.instant());
        List<Group> items = new ArrayList<>(file.items().stream().filter(g -> !g.id().equals(group.id())).toList());
        items.add(stamped);
        file.save(items);
        return stamped;
    }

    /**
     * FE-13: persists a new group order. Listed groups take positions 1..n in the given order; groups
     * left out keep their relative order after them. Unknown or repeated ids reject the whole change.
     */
    public synchronized List<Group> reorder(List<String> groupIds, String operator) {
        return reorder(groupIds, java.util.Map.of(), operator);
    }

    /**
     * Same as {@link #reorder(List, String)} and also stores the manual monitor order of the groups in
     * {@code monitorOrder} (group id to monitor ids).
     */
    public synchronized List<Group> reorder(List<String> groupIds, java.util.Map<String, List<String>> monitorOrder,
                                            String operator) {
        String by = OperatorName.normalize(operator);
        List<String> errors = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (String id : groupIds) {
            if (!seen.add(id)) {
                errors.add(id + ": listed twice");
            } else if (find(id).isEmpty()) {
                errors.add(id + ": unknown group");
            }
        }
        monitorOrder.keySet().stream().filter(id -> find(id).isEmpty()).forEach(id -> errors.add(id + ": unknown group"));
        if (!errors.isEmpty()) {
            throw new ConfigValidationException(errors);
        }
        List<Group> ordered = new ArrayList<>();
        groupIds.forEach(id -> ordered.add(find(id).orElseThrow()));
        list().stream().filter(g -> !seen.contains(g.id())).forEach(ordered::add);
        java.time.Instant now = clock.instant();
        List<Group> items = new ArrayList<>();
        for (int i = 0; i < ordered.size(); i++) {
            Group g = ordered.get(i);
            boolean monitorsMoved = monitorOrder.containsKey(g.id());
            if (monitorsMoved) {
                g = g.withMonitorOrder(monitorOrder.get(g.id()));
            }
            items.add(g.order() == i + 1 && !seen.contains(g.id()) && !monitorsMoved ? g
                    : g.withOrder(i + 1).touchedBy(by, now));
        }
        file.save(items);
        return list();
    }

    public synchronized boolean delete(String id) {
        List<Group> items = file.items().stream().filter(g -> !g.id().equals(id)).toList();
        if (items.size() == file.items().size()) {
            return false;
        }
        file.save(items);
        return true;
    }

    /** Worst state among the members; UNKNOWN when there are none or none reported yet. */
    public static MonitorState stateOf(List<String> monitorIds, Function<String, MonitorState> stateLookup) {
        return MonitorState.worstOf(monitorIds.stream().map(stateLookup).filter(Objects::nonNull).toList());
    }
}
