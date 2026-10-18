package io.orbit.api.web;

import io.orbit.api.wall.WallViewFactory;
import io.orbit.api.wall.WallViews;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
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

    /** Group plus its state (worst member state). */
    public record GroupResponse(String id, String name, String color, String icon, String description, String owner,
                                List<String> tags, int order, String status, Instant updatedAt, String updatedBy) {
    }

    private final GroupService groups;
    private final WallViewFactory views;
    private final AuditLog audit;

    public GroupController(GroupService groups, WallViewFactory views, AuditLog audit) {
        this.groups = groups;
        this.views = views;
        this.audit = audit;
    }

    @GetMapping
    public List<GroupResponse> list() {
        Map<String, String> states = views.groupViews().stream()
                .collect(Collectors.toMap(WallViews.GroupView::id, WallViews.GroupView::status));
        return groups.list().stream().map(g -> response(g, states.getOrDefault(g.id(), "UNKNOWN"))).toList();
    }

    @PutMapping("/{id}")
    public GroupResponse save(@PathVariable String id, @RequestBody GroupRequest body,
                              @RequestHeader(value = Operators.HEADER, required = false) String operatorHeader,
                              HttpServletRequest request) {
        String operator = Operators.require(operatorHeader, null);
        Group saved = groups.save(new Group(id, body.name(), body.color(), body.icon(), body.description(),
                body.owner(), body.tags(), body.order() == null ? 0 : body.order(), null, null), operator);
        audit.record(operator, "group.save", id, saved.name(), request.getRemoteAddr());
        return response(saved, statusOf(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestHeader(value = Operators.HEADER, required = false) String operatorHeader,
                                       HttpServletRequest request) {
        String operator = Operators.require(operatorHeader, null);
        if (!groups.delete(id)) {
            throw new NotFoundException("Group", id);
        }
        audit.record(operator, "group.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private String statusOf(String id) {
        return views.groupViews().stream().filter(g -> g.id().equals(id)).map(WallViews.GroupView::status)
                .findFirst().orElse("UNKNOWN");
    }

    private static GroupResponse response(Group g, String status) {
        return new GroupResponse(g.id(), g.name(), g.color(), g.icon(), g.description(), g.owner(), g.tags(),
                g.order(), status, g.updatedAt(), g.updatedBy());
    }
}
