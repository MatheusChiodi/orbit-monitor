package io.orbit.api.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.monitor.definition.CheckMonitorDef;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.MonitorEdits;
import io.orbit.probe.push.PushRegistry;
import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.GroupService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * BE-54 / BE-56: actions on existing monitors that do not resend the definition (whose secrets the
 * client only has masked): pause, resume, duplicate, bulk changes and push token rotation.
 */
@RestController
public class MonitorActionsController {

    static final int MAX_BULK = 500;
    private static final Set<String> BULK_ACTIONS = Set.of("pause", "resume", "delete", "move");

    /** Body of POST /api/monitors/bulk; {@code groupId} is required by {@code move}. */
    public record BulkRequest(List<String> ids, String action, String groupId) {
    }

    /** {@code error} is {@code not-found} or {@code failed} when {@code ok} is false. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record BulkItem(String id, boolean ok, String error) {
    }

    public record BulkResult(String action, List<BulkItem> results) {
    }

    public record PushUrl(String monitorId, String pushUrl) {
    }

    private final MonitorDefinitions definitions;
    private final MonitorRuntime runtime;
    private final MonitorController monitors;
    private final MonitorRequestMapper mapper;
    private final PushRegistry push;
    private final GroupService groups;
    private final AuditLog audit;

    public MonitorActionsController(MonitorDefinitions definitions, MonitorRuntime runtime,
                                    MonitorController monitors, MonitorRequestMapper mapper, PushRegistry push,
                                    GroupService groups, AuditLog audit) {
        this.definitions = definitions;
        this.runtime = runtime;
        this.monitors = monitors;
        this.mapper = mapper;
        this.push = push;
        this.groups = groups;
        this.audit = audit;
    }

    @PostMapping("/api/monitors/{id}/pause")
    public MonitorController.MonitorDetail pause(@PathVariable String id, HttpServletRequest request) {
        return setPaused(id, true, request);
    }

    @PostMapping("/api/monitors/{id}/resume")
    public MonitorController.MonitorDetail resume(@PathVariable String id, HttpServletRequest request) {
        return setPaused(id, false, request);
    }

    /** A new monitor named "<name> (copy)" with the same settings and sealed secrets, active. */
    @PostMapping("/api/monitors/{id}/duplicate")
    public ResponseEntity<MonitorController.MonitorDetail> duplicate(@PathVariable String id,
                                                                     HttpServletRequest request) {
        String operator = Actors.current();
        MonitorDef original = find(id);
        MonitorDef copy = MonitorEdits.copy(original, MonitorEdits.copyId(original), original.name() + " (copy)");
        String pushUrl = null;
        MonitorDef saved;
        if (copy instanceof CheckMonitorDef check && check.type() == CheckMonitorDef.Type.PUSH) {
            String token = monitors.newPushToken(check);
            try {
                saved = definitions.saveCheck(mapper.sealPushToken(check, token), operator);
            } catch (RuntimeException e) {
                push.forget(check.id());
                throw e;
            }
            pushUrl = MonitorController.pushUrl(token);
        } else {
            saved = definitions.save(copy, operator);
        }
        audit.record(operator, "monitor.duplicate", saved.id(), "from " + id, request.getRemoteAddr());
        runtime.syncSchedule();
        return ResponseEntity.status(HttpStatus.CREATED).body(monitors.detail(saved, pushUrl));
    }

    /** Issues a new push URL; the previous one stops working at once. */
    @PostMapping("/api/monitors/{id}/push-token")
    public PushUrl pushToken(@PathVariable String id, HttpServletRequest request) {
        String operator = Actors.current();
        if (!(find(id) instanceof CheckMonitorDef check) || check.type() != CheckMonitorDef.Type.PUSH) {
            throw new IllegalArgumentException(id + " is not a push monitor");
        }
        String token = monitors.newPushToken(check);
        try {
            definitions.saveCheck(mapper.sealPushToken(check, token), operator);
        } catch (RuntimeException e) {
            runtime.syncSchedule();
            throw e;
        }
        audit.record(operator, "monitor.push-token", id, null, request.getRemoteAddr());
        runtime.syncSchedule();
        return new PushUrl(id, MonitorController.pushUrl(token));
    }

    /** One action over many monitors; every id gets its own result and the change is one audit entry. */
    @PostMapping("/api/monitors/bulk")
    public BulkResult bulk(@RequestBody BulkRequest body, HttpServletRequest request) {
        String operator = Actors.current();
        String action = body.action() == null ? "" : body.action().toLowerCase(Locale.ROOT);
        if (!BULK_ACTIONS.contains(action)) {
            throw new IllegalArgumentException("action must be pause, resume, delete or move");
        }
        if (body.ids() == null || body.ids().isEmpty() || body.ids().size() > MAX_BULK) {
            throw new IllegalArgumentException("ids must list 1 to " + MAX_BULK + " monitors");
        }
        if (action.equals("move") && (body.groupId() == null || groups.find(body.groupId()).isEmpty())) {
            throw new IllegalArgumentException("move needs the groupId of an existing group");
        }
        List<BulkItem> results = new ArrayList<>();
        List<String> done = new ArrayList<>();
        for (String id : new LinkedHashSet<>(body.ids())) {
            BulkItem item = apply(action, id, body.groupId(), operator);
            results.add(item);
            if (item.ok()) {
                done.add(id);
            }
        }
        audit.record(operator, "monitor.bulk", body.groupId(), action + " " + done.size() + ": "
                + String.join(", ", done), request.getRemoteAddr());
        runtime.syncSchedule();
        return new BulkResult(action, results);
    }

    private BulkItem apply(String action, String id, String groupId, String operator) {
        try {
            boolean found = switch (action) {
                case "pause" -> definitions.setPaused(id, true, operator);
                case "resume" -> definitions.setPaused(id, false, operator);
                case "move" -> definitions.moveToGroup(id, groupId, operator);
                default -> {
                    boolean deleted = definitions.delete(id);
                    if (deleted) {
                        push.forget(id);
                    }
                    yield deleted;
                }
            };
            return found ? new BulkItem(id, true, null) : new BulkItem(id, false, "not-found");
        } catch (RuntimeException e) {
            return new BulkItem(id, false, "failed");
        }
    }

    private MonitorController.MonitorDetail setPaused(String id, boolean paused, HttpServletRequest request) {
        String operator = Actors.current();
        if (!definitions.setPaused(id, paused, operator)) {
            throw new NotFoundException("Monitor", id);
        }
        audit.record(operator, paused ? "monitor.pause" : "monitor.resume", id, null, request.getRemoteAddr());
        runtime.syncSchedule();
        return monitors.detail(find(id), null);
    }

    private MonitorDef find(String id) {
        return definitions.monitor(id).orElseThrow(() -> new NotFoundException("Monitor", id));
    }
}
