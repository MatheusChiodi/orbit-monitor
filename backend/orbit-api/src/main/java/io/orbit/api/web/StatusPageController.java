package io.orbit.api.web;

import io.orbit.api.wall.WallViewFactory;
import io.orbit.api.wall.WallViews;
import io.orbit.common.MonitorState;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.security.audit.AuditLog;
import io.orbit.telemetry.MonitorStatus;
import io.orbit.telemetry.TelemetryService;
import io.orbit.telemetry.UptimeReport;
import io.orbit.workspace.status.StatusPageBuilder;
import io.orbit.workspace.status.StatusPageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * BE-42: status pages. Definitions ({@code orbit.status-pages.json}) are managed by editors; the
 * rendered page ({@code GET /api/status/{slug}}) has only group names, states and uptime, is cached for
 * a short time and carries an ETag. Internal pages answer 404 to view-only clients.
 */
@RestController
public class StatusPageController {

    static final int MAX_AGE_SECONDS = 30;

    public record StatusPageRequest(String id, String slug, String title, List<String> groupIds, Boolean pub) {
    }

    private final StatusPageService pages;
    private final WallViewFactory views;
    private final MonitorDefinitions definitions;
    private final TelemetryService telemetry;
    private final Editors editors;
    private final AuditLog audit;

    public StatusPageController(StatusPageService pages, WallViewFactory views, MonitorDefinitions definitions,
                                TelemetryService telemetry, Editors editors, AuditLog audit) {
        this.pages = pages;
        this.views = views;
        this.definitions = definitions;
        this.telemetry = telemetry;
        this.editors = editors;
        this.audit = audit;
    }

    /** Page definitions the client may see (internal ones only for editors). */
    @GetMapping("/api/status-pages")
    public ConfigPayload<StatusPageBuilder.StatusPage> list(HttpServletRequest request) {
        return ConfigPayload.of(pages.visible(editors.isEditor(request)));
    }

    @GetMapping("/api/status/{slug}")
    public ResponseEntity<StatusPageBuilder.View> view(@PathVariable String slug, HttpServletRequest request,
                                                       HttpServletResponse response) {
        StatusPageBuilder.View view = render(slug, request).orElseThrow(() -> new NotFoundException("Status page", slug));
        String etag = etag(view);
        cacheHeaders(slug, response);
        response.setHeader("ETag", etag);
        if (etag.equals(request.getHeader("If-None-Match"))) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).build();
        }
        return ResponseEntity.ok(view);
    }

    /** The page as the client may see it; empty when unknown or internal for a view-only client. */
    Optional<StatusPageBuilder.View> render(String slug, HttpServletRequest request) {
        return pages.view(slug, editors.isEditor(request), groupInputs());
    }

    boolean isPublic(String slug) {
        return pages.bySlug(slug).map(StatusPageBuilder.StatusPage::pub).orElse(false);
    }

    /** Set on the servlet response so it replaces the API-wide "no-store" of the access filter. */
    void cacheHeaders(String slug, HttpServletResponse response) {
        response.setHeader("Cache-Control", (isPublic(slug) ? "public" : "private") + ", max-age=" + MAX_AGE_SECONDS);
    }

    @PostMapping("/api/status-pages")
    public ResponseEntity<StatusPageBuilder.StatusPage> create(@RequestBody StatusPageRequest body,
                                                               HttpServletRequest request) {
        if (body.id() != null && pages.find(body.id()).isPresent()) {
            throw new IllegalStateException("Status page already exists: " + body.id());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(save(body.id(), body, request));
    }

    @PutMapping("/api/status-pages/{id}")
    public StatusPageBuilder.StatusPage update(@PathVariable String id, @RequestBody StatusPageRequest body,
                                               HttpServletRequest request) {
        return save(id, body, request);
    }

    @DeleteMapping("/api/status-pages/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       HttpServletRequest request) {
        String operator = Actors.current();
        if (!pages.delete(id)) {
            throw new NotFoundException("Status page", id);
        }
        audit.record(operator, "status-page.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private StatusPageBuilder.StatusPage save(String id, StatusPageRequest body,
                                              HttpServletRequest request) {
        String operator = Actors.current();
        StatusPageBuilder.StatusPage saved = pages.save(new StatusPageBuilder.StatusPage(id, body.slug(), body.title(),
                body.groupIds(), Boolean.TRUE.equals(body.pub())), operator);
        audit.record(operator, "status-page.save", id, saved.slug() + (saved.pub() ? " (public)" : " (internal)"),
                request.getRemoteAddr());
        return saved;
    }

    /** Group name, maintenance-aware state and mean uptime of the members that have data. */
    private Map<String, StatusPageBuilder.GroupInput> groupInputs() {
        Map<String, List<String>> members = definitions.monitors().stream().filter(m -> m.groupId() != null)
                .collect(Collectors.groupingBy(MonitorDef::groupId,
                        Collectors.mapping(MonitorDef::id, Collectors.toList())));
        Map<String, StatusPageBuilder.GroupInput> inputs = new HashMap<>();
        for (WallViews.GroupView g : views.groupViews()) {
            inputs.put(g.id(), new StatusPageBuilder.GroupInput(g.id(), g.name(), state(g.status()),
                    uptime(members.getOrDefault(g.id(), List.of()))));
        }
        return inputs;
    }

    private Double uptime(List<String> monitorIds) {
        List<Double> ratios = monitorIds.stream().map(telemetry::status).filter(Objects::nonNull)
                .map(MonitorStatus::uptime).filter(u -> u.samples() > 0).map(UptimeReport::ratio).toList();
        return ratios.isEmpty() ? null
                : ratios.stream().mapToDouble(Double::doubleValue).average().orElse(1) * 100.0;
    }

    private static MonitorState state(String status) {
        try {
            return MonitorState.valueOf(status);
        } catch (IllegalArgumentException | NullPointerException e) {
            return MonitorState.UNKNOWN;
        }
    }

    private static String etag(StatusPageBuilder.View view) {
        String content = view.title() + "|" + view.overall() + "|" + view.groups();
        return "\"" + Integer.toHexString(java.util.Arrays.hashCode(content.getBytes(StandardCharsets.UTF_8))) + "\"";
    }
}
