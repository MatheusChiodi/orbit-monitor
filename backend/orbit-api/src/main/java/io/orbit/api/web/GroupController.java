package io.orbit.api.web;

import io.orbit.api.wall.WallViewFactory;
import io.orbit.api.wall.WallViews;
import io.orbit.config.ConfigValidationException;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.Group;
import io.orbit.workspace.GroupService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Groups (orbit.groups.json) with their current state. */
@RestController
@RequestMapping("/api/groups")
public class GroupController {

    /** Body of PUT /api/groups/{id}. */
    public record GroupRequest(String name, String color, String icon, String description, String owner,
                               List<String> tags, Integer order) {
    }

    /**
     * Group plus its state (worst member state, monitors in maintenance left out) and the manual order of
     * its monitors (FE-13).
     */
    public record GroupResponse(String id, String name, String color, String icon, String description, String owner,
                                List<String> tags, int order, String status, Instant updatedAt, String updatedBy,
                                List<String> monitorOrder) {
    }

    /**
     * Body of PUT /api/groups/order (FE-13): the group order, and optionally the monitors of each group in
     * their manual order. A monitor listed under another group moves to it.
     */
    public record OrderRequest(List<String> groupIds, Map<String, List<String>> monitors) {
    }

    private final GroupService groups;
    private final WallViewFactory views;
    private final MonitorDefinitions definitions;
    private final AuditLog audit;

    public GroupController(GroupService groups, WallViewFactory views, MonitorDefinitions definitions,
                           AuditLog audit) {
        this.groups = groups;
        this.views = views;
        this.definitions = definitions;
        this.audit = audit;
    }

    @GetMapping
    public List<GroupResponse> list() {
        Map<String, String> states = views.groupViews().stream()
                .collect(Collectors.toMap(WallViews.GroupView::id, WallViews.GroupView::status));
        return groups.list().stream().map(g -> response(g, states.getOrDefault(g.id(), "UNKNOWN"))).toList();
    }

    /** FE-13: persists the group order and, when given, the monitors of each group in order. */
    @PutMapping("/order")
    public List<GroupResponse> order(@RequestBody OrderRequest body,
                                     HttpServletRequest request) {
        String operator = Actors.current();
        Map<String, List<String>> monitors = body.monitors() == null ? Map.of() : body.monitors();
        List<String> unknown = monitors.values().stream().flatMap(List::stream)
                .filter(id -> definitions.monitor(id).isEmpty()).toList();
        if (!unknown.isEmpty()) {
            throw new ConfigValidationException(unknown.stream().map(id -> id + ": unknown monitor").toList());
        }
        groups.reorder(body.groupIds() == null ? List.of() : body.groupIds(), monitors, operator);
        monitors.forEach((groupId, ids) -> ids.forEach(id -> {
            if (!groupId.equals(definitions.monitor(id).map(MonitorDef::groupId).orElse(null))) {
                definitions.moveToGroup(id, groupId, operator);
            }
        }));
        audit.record(operator, "group.order", null, String.valueOf(body.groupIds()), request.getRemoteAddr());
        return list();
    }

    @PutMapping("/{id}")
    public GroupResponse save(@PathVariable String id, @RequestBody GroupRequest body,
                              HttpServletRequest request) {
        String operator = Actors.current();
        List<String> monitorOrder = groups.find(id).map(Group::monitorOrder).orElse(List.of());
        Group saved = groups.save(new Group(id, body.name(), body.color(), body.icon(), body.description(),
                body.owner(), body.tags(), body.order() == null ? 0 : body.order(), null, null, monitorOrder), operator);
        audit.record(operator, "group.save", id, saved.name(), request.getRemoteAddr());
        return response(saved, statusOf(id));
    }

    /** A member listed in the 409 answer to deleting a group that still has monitors. */
    public record Member(String id, String name) {
    }

    /**
     * BE-55: a group is never deleted with monitors in it. Without {@code moveTo} a group with members
     * answers 409 {@code group-not-empty} listing them; with it they move to that group first.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestParam(required = false) String moveTo,
                                       HttpServletRequest request) {
        String operator = Actors.current();
        if (groups.find(id).isEmpty()) {
            throw new NotFoundException("Group", id);
        }
        List<MonitorDef> members = definitions.monitors().stream().filter(m -> id.equals(m.groupId())).toList();
        if (moveTo != null && (moveTo.equals(id) || groups.find(moveTo).isEmpty())) {
            throw new IllegalArgumentException("moveTo must be another existing group");
        }
        if (!members.isEmpty() && moveTo == null) {
            throw new ConflictException("group-not-empty", "Group " + id + " has " + members.size() + " monitors",
                    Map.of("members", members.stream().map(m -> new Member(m.id(), m.name())).toList()),
                    members.size());
        }
        members.forEach(m -> definitions.moveToGroup(m.id(), moveTo, operator));
        groups.delete(id);
        audit.record(operator, "group.delete", id, members.isEmpty() ? null
                : members.size() + " monitors moved to " + moveTo, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private String statusOf(String id) {
        return views.groupViews().stream().filter(g -> g.id().equals(id)).map(WallViews.GroupView::status)
                .findFirst().orElse("UNKNOWN");
    }

    private static GroupResponse response(Group g, String status) {
        return new GroupResponse(g.id(), g.name(), g.color(), g.icon(), g.description(), g.owner(), g.tags(),
                g.order(), status, g.updatedAt(), g.updatedBy(), g.monitorOrder());
    }
}
