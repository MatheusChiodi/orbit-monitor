package io.orbit.api.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.api.wall.WallViewFactory;
import io.orbit.api.wall.WallViews;
import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.probe.CheckResult;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
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

    public record MonitorDetail(Map<String, Object> definition, WallViews.MonitorView status, ResultView lastResult,
                                UptimeReport uptime, LatencySummary latency, Instant historySince) {
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

    public MonitorController(MonitorDefinitions definitions, MonitorRuntime runtime, TelemetryService telemetry,
                             WallViewFactory views, MonitorRequestMapper mapper,
                             PreviewService preview, AuditLog audit, ObjectMapper json) {
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
    public List<WallViews.MonitorView> list() {
        return definitions.monitors().stream().map(views::monitorView).toList();
    }

    @GetMapping("/api/monitors/{id}")
    public MonitorDetail get(@PathVariable String id) {
        return detail(definitions.monitor(id).orElseThrow(() -> new NotFoundException("Monitor", id)));
    }

    @PostMapping("/api/monitors")
    public MonitorDetail save(@RequestBody MonitorRequest body,
                              @RequestHeader(value = Operators.HEADER, required = false) String header,
                              HttpServletRequest request) {
        String operator = Operators.require(header, null);
        String type = body.type() == null ? "" : body.type().toUpperCase(Locale.ROOT);
        MonitorDef saved = switch (type) {
            case "SQL" -> definitions.saveSelect(mapper.toSql(body), operator);
            case "HTTP" -> definitions.saveRequest(mapper.toHttp(body), operator);
            default -> throw new IllegalArgumentException("type must be SQL or HTTP");
        };
        String detail = saved instanceof SqlMonitorDef sql ? sql.sql() : ((HttpMonitorDef) saved).url();
        audit.record(operator, type.toLowerCase(Locale.ROOT) + ".save", saved.id(), detail, request.getRemoteAddr());
        runtime.syncSchedule();
        return detail(saved);
    }

    @DeleteMapping("/api/monitors/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        String operator = Operators.require(header, null);
        if (!definitions.deleteSelect(id) && !definitions.deleteRequest(id)) {
            throw new NotFoundException("Monitor", id);
        }
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
                                                @RequestHeader(value = Operators.HEADER, required = false) String header,
                                                HttpServletRequest request) {
        String operator = Operators.require(header, null);
        boolean sql = "SQL".equalsIgnoreCase(body.type());
        audit.record(operator, sql ? "select.preview" : "request.preview", sql ? body.connectionId() : body.url(),
                sql ? body.sql() : body.method() + " " + body.url(), request.getRemoteAddr());
        return sql ? preview.sql(body.connectionId(), body.sql())
                : preview.http(body.method(), body.url(), body.headers(), body.body());
    }

    @PostMapping("/api/conditions/validate")
    public ConditionInfo validate(@RequestBody MonitorRequest.ConditionCheck body) {
        Severity level = body.level() == null ? Severity.DOWN : Severity.valueOf(body.level().toUpperCase(Locale.ROOT));
        Condition c = new ConditionParser().parse(body.expression(), level);
        return new ConditionInfo(c.expression(), c.placeholder().name(), c.path(), c.operator().symbol(), level.name());
    }

    private MonitorDetail detail(MonitorDef def) {
        MonitorStatus status = telemetry.status(def.id());
        ResultView last = runtime.latest(def.id()).map(MonitorController::result).orElse(null);
        return new MonitorDetail(maskedDefinition(def), views.monitorView(def), last, status.uptime(),
                status.latency(), status.history().isEmpty() ? null : status.history().getFirst().at());
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
