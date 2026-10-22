package io.orbit.api.web;

import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** CORE-07: workspaces ({@code orbit.workspaces.json}), each listing its groups; a group is in one workspace. */
@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    public record WorkspaceRequest(String id, String name, List<String> groupIds) {
    }

    private final WorkspaceService workspaces;
    private final AuditLog audit;

    public WorkspaceController(WorkspaceService workspaces, AuditLog audit) {
        this.workspaces = workspaces;
        this.audit = audit;
    }

    @GetMapping
    public ConfigPayload<WorkspaceService.Workspace> list() {
        return ConfigPayload.of(workspaces.list());
    }

    @GetMapping("/{id}")
    public WorkspaceService.Workspace get(@PathVariable String id) {
        return workspaces.find(id).orElseThrow(() -> new NotFoundException("Workspace", id));
    }

    @PostMapping
    public ResponseEntity<WorkspaceService.Workspace> create(@RequestBody WorkspaceRequest body,
                                                             HttpServletRequest request) {
        if (body.id() != null && workspaces.find(body.id()).isPresent()) {
            throw new IllegalStateException("Workspace already exists: " + body.id());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(save(body.id(), body, request));
    }

    @PutMapping("/{id}")
    public WorkspaceService.Workspace update(@PathVariable String id, @RequestBody WorkspaceRequest body,
                                             HttpServletRequest request) {
        return save(id, body, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       HttpServletRequest request) {
        String operator = Actors.current();
        if (!workspaces.delete(id)) {
            throw new NotFoundException("Workspace", id);
        }
        audit.record(operator, "workspace.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private WorkspaceService.Workspace save(String id, WorkspaceRequest body,
                                            HttpServletRequest request) {
        String operator = Actors.current();
        WorkspaceService.Workspace saved = workspaces.save(new WorkspaceService.Workspace(id, body.name(),
                body.groupIds()), operator);
        audit.record(operator, "workspace.save", id, saved.name(), request.getRemoteAddr());
        return saved;
    }
}
