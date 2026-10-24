package io.orbit.api.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.api.runtime.SelfMonitor;
import io.orbit.api.wall.WallViewFactory;
import io.orbit.api.wall.WallViews;
import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.definition.CheckMonitorDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.probe.CheckResult;
import io.orbit.probe.push.PushRegistry;
import io.orbit.security.audit.AuditLog;
import io.orbit.telemetry.LatencySummary;
import io.orbit.telemetry.MonitorStatus;
import io.orbit.telemetry.TelemetryService;
import io.orbit.telemetry.UptimeReport;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Monitors: list (wall views), details, create/update, delete, run now, preview and condition check. */
@RestController
public class MonitorController {

    public record ConditionView(String expression, String level, boolean passed, Object actual, String message) {
    }

    public record ResultView(String state, long latencyMs, Object payload, List<ConditionView> conditions,
                             String error, Instant checkedAt) {
    }

    /** {@code pushUrl} is present only in the response that creates a push monitor. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MonitorDetail(Map<String, Object> definition, WallViews.MonitorView status, ResultView lastResult,
                                UptimeReport uptime, LatencySummary latency, Instant historySince, String pushUrl) {
    }

    public record ConditionInfo(String expression, String placeholder, String path, String operator, String level) {
    }

    private final MonitorDefinitions definitions;
    private final MonitorRuntime runtime;
    private final TelemetryService telemetry;
    private final WallViewFactory views;
    private final MonitorRequestMapper mapper;
    private final PreviewService preview;
    private final AuditLog audit;
    private final ObjectMapper json;
    private final PushRegistry push;
    private final SelfMonitor self;

    public MonitorController(MonitorDefinitions definitions, MonitorRuntime runtime, TelemetryService telemetry,
                             WallViewFactory views, MonitorRequestMapper mapper,
                             PreviewService preview, AuditLog audit, ObjectMapper json, PushRegistry push,
                             SelfMonitor self) {
        this.push = push;
        this.self = self;
        this.definitions = definitions;
        this.runtime = runtime;
        this.telemetry = telemetry;
        this.views = views;
        this.mapper = mapper;
        this.preview = preview;
        this.audit = audit;
        this.json = json;
    }

    @GetMapping("/api/monitors")
    /** BE-50: Orbit's own health ({@code orbit_self}) is always the first entry. */
    public List<WallViews.MonitorView> list() {
        List<WallViews.MonitorView> list = new ArrayList<>();
        list.add(self.view());
        definitions.monitors().stream().map(views::monitorView).forEach(list::add);
        return list;
    }

    @GetMapping("/api/monitors/{id}")
    public MonitorDetail get(@PathVariable String id) {
        return detail(definitions.monitor(id).orElseThrow(() -> new NotFoundException("Monitor", id)), null);
    }

    @PostMapping("/api/monitors")
    public MonitorDetail save(@RequestBody MonitorRequest body,
                              HttpServletRequest request) {
        String operator = Actors.current();
        if (SelfMonitor.ID.equals(body.id())) {
            throw new IllegalArgumentException(SelfMonitor.ID + " is reserved for Orbit's own health");
        }
        String type = body.type() == null ? "" : body.type().toUpperCase(Locale.ROOT);
        String pushUrl = null;
        MonitorDef saved;
        switch (type) {
            case "SQL" -> saved = definitions.saveSelect(mapper.toSql(body), operator);
            case "HTTP" -> saved = definitions.saveRequest(mapper.toHttp(body), operator);
            case "TCP", "PING", "PUSH", "DNS", "GRPC", "KAFKA", "CERT" -> {
                CheckMonitorDef check = mapper.toCheck(body, CheckMonitorDef.Type.valueOf(type));
                if (check.type() == CheckMonitorDef.Type.PUSH && check.pushToken() == null) {
                    String token = newPushToken(check);
                    try {
                        saved = definitions.saveCheck(mapper.sealPushToken(check, token), operator);
                    } catch (RuntimeException e) {
                        push.forget(check.id());
                        throw e;
                    }
                    pushUrl = pushUrl(token);
                } else {
                    saved = definitions.saveCheck(check, operator);
                }
            }
            default -> throw new IllegalArgumentException(
                    "type must be SQL, HTTP, TCP, PING, PUSH, DNS, GRPC, KAFKA or CERT");
        }
        audit.record(operator, type.toLowerCase(Locale.ROOT) + ".save", saved.id(), auditDetail(saved),
                request.getRemoteAddr());
        runtime.syncSchedule();
        return detail(saved, pushUrl);
    }

    /** The URL a job calls, built from the address the operator used to reach Orbit. */
    static String pushUrl(String token) {
        return ServletUriComponentsBuilder.fromCurrentContextPath().path("/api/push/{token}")
                .buildAndExpand(token).toUriString();
    }

    String newPushToken(CheckMonitorDef check) {
        int silence = check.maxSilenceSeconds() == null ? 0 : check.maxSilenceSeconds();
        return push.register(check.id(), Duration.ofSeconds(silence));
    }

    /** What the audit trail records about a saved monitor; never a secret such as a push token. */
    private static String auditDetail(MonitorDef saved) {
        return switch (saved) {
            case SqlMonitorDef sql -> sql.sql();
            case HttpMonitorDef http -> http.url();
            case CheckMonitorDef check -> switch (check.type()) {
                case PUSH -> "push, max silence " + check.maxSilenceSeconds() + " s";
                case KAFKA -> "kafka " + check.probe().bootstrapServers() + " " + check.probe().consumerGroup()
                        + "/" + check.probe().topic();
                case CERT -> "cert " + (check.host() == null ? "" : check.host() + " ")
                        + (check.probe().domain() == null ? "" : check.probe().domain());
                default -> check.host() + (check.port() == null ? "" : ":" + check.port());
            };
            default -> null;
        };
    }

    @DeleteMapping("/api/monitors/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       HttpServletRequest request) {
        String operator = Actors.current();
        if (!definitions.deleteSelect(id) && !definitions.deleteRequest(id) && !definitions.deleteCheck(id)) {
            throw new NotFoundException("Monitor", id);
        }
        push.forget(id);
        audit.record(operator, "monitor.delete", id, null, request.getRemoteAddr());
        runtime.syncSchedule();
        return ResponseEntity.noContent().build();
    }

    /** "Test now": runs the check synchronously and returns its masked result. */
    @PostMapping("/api/monitors/{id}/run")
    public ResultView run(@PathVariable String id) {
        if (definitions.monitor(id).isEmpty()) {
            throw new NotFoundException("Monitor", id);
        }
        return result(runtime.runCheck(id).orElseThrow(() -> new NotFoundException("Monitor", id)));
    }

    @PostMapping("/api/monitors/preview")
    public PreviewService.PreviewResult preview(@RequestBody MonitorRequest.PreviewRequest body,
                                                HttpServletRequest request) {
        String operator = Actors.current();
        boolean sql = "SQL".equalsIgnoreCase(body.type());
        audit.record(operator, sql ? "select.preview" : "request.preview", sql ? body.connectionId() : body.url(),
                sql ? body.sql() : body.method() + " " + body.url(), request.getRemoteAddr());
        return sql ? preview.sql(body.connectionId(), body.sql(), body.parameters(),
                body.intervalSeconds() == null ? 60 : body.intervalSeconds())
                : preview.http(body.method(), body.url(), body.headers(), body.body());
    }

    @PostMapping("/api/conditions/validate")
    public ConditionInfo validate(@RequestBody MonitorRequest.ConditionCheck body) {
        Severity level = body.level() == null ? Severity.DOWN : Severity.valueOf(body.level().toUpperCase(Locale.ROOT));
        Condition c = new ConditionParser().parse(body.expression(), level);
        return new ConditionInfo(c.expression(), c.placeholder().name(), c.path(), c.operator().symbol(), level.name());
    }

    MonitorDetail detail(MonitorDef def, String pushUrl) {
        MonitorStatus status = telemetry.status(def.id());
        ResultView last = runtime.latest(def.id()).map(MonitorController::result).orElse(null);
        return new MonitorDetail(maskedDefinition(def), views.monitorView(def), last, status.uptime(),
                status.latency(), status.history().isEmpty() ? null : status.history().getFirst().at(), pushUrl);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> maskedDefinition(MonitorDef def) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("type", def.kind().name());
        map.putAll(json.convertValue(def, Map.class));
        if (def instanceof HttpMonitorDef http) {
            Map<String, String> masked = new LinkedHashMap<>();
            http.secretHeaders().forEach((name, ref) -> masked.put(name, ref.masked()));
            map.put("secretHeaders", masked);
            if (http.oauth() != null) {
                Map<String, Object> oauth = new LinkedHashMap<>();
                oauth.put("tokenUrl", http.oauth().tokenUrl());
                oauth.put("clientId", http.oauth().clientId());
                oauth.put("clientSecret", http.oauth().clientSecret() == null ? null
                        : http.oauth().clientSecret().masked());
                oauth.put("scope", http.oauth().scope());
                map.put("oauth", oauth);
            }
        }
        if (def instanceof CheckMonitorDef check && check.pushToken() != null) {
            map.put("pushToken", check.pushToken().masked());
        }
        return map;
    }

    static ResultView result(CheckResult r) {
        List<ConditionView> conditions = r.conditions().stream().map(MonitorController::condition).toList();
        return new ResultView(r.state().name(), r.latencyMs(), r.payload(), conditions, r.error(), r.checkedAt());
    }

    private static ConditionView condition(ConditionResult c) {
        return new ConditionView(c.condition().expression(), c.condition().severity().name(), c.passed(), c.actual(),
                c.message());
    }
}
