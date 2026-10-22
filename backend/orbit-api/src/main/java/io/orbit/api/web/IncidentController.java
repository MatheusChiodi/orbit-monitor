package io.orbit.api.web;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;
import io.orbit.alerting.IncidentService;
import io.orbit.alerting.IncidentStatus;
import io.orbit.alerting.report.PostmortemReport;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.security.audit.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Incidents in memory (BE-26/CORE-06): list, details with timeline, acknowledge, comment, link a
 * ticket, resolve, reopen, and the postmortem report with MTTA/MTTR (BE-34).
 */
@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    /** {@code by} is the self-declared operator name (the header works too). */
    public record AckRequest(String by) {
    }

    public record CommentRequest(String by, String text) {
    }

    public record TicketRequest(String by, String ticket) {
    }

    /** Times in seconds; null while the incident is not acknowledged / not resolved. */
    public record PostmortemView(String incidentId, String monitorId, String monitorName, String groupId,
                                 String status, String severity, Instant openedAt, Instant acknowledgedAt,
                                 String acknowledgedBy, Instant resolvedAt, Long timeToAcknowledgeSeconds,
                                 Long timeToResolveSeconds, String ticket, List<IncidentEvent> timeline) {
    }

    /** MTTA/MTTR over the incidents in memory; {@code groupId} null = monitors without a group. */
    public record SummaryView(int incidents, Long meanTimeToAcknowledgeSeconds, Long meanTimeToResolveSeconds,
                              List<GroupSummary> groups) {
    }

    public record GroupSummary(String groupId, int incidents, Long meanTimeToAcknowledgeSeconds,
                               Long meanTimeToResolveSeconds) {
    }

    private final IncidentService incidents;
    private final MonitorDefinitions definitions;
    private final AuditLog audit;

    public IncidentController(IncidentService incidents, MonitorDefinitions definitions, AuditLog audit) {
        this.incidents = incidents;
        this.definitions = definitions;
        this.audit = audit;
    }

    /** Newest first; {@code status} OPEN or RESOLVED, {@code monitorId} exact match. */
    @GetMapping
    public List<Incident> list(@RequestParam(required = false) String status,
                               @RequestParam(required = false) String monitorId) {
        IncidentStatus wanted = status == null || status.isBlank() ? null : parseStatus(status);
        return incidents.recent().stream()
                .filter(i -> wanted == null || i.status() == wanted)
                .filter(i -> monitorId == null || monitorId.isBlank() || i.monitorId().equals(monitorId))
                .toList();
    }

    @GetMapping("/{id}")
    public Incident get(@PathVariable String id) {
        return require(id);
    }

    @GetMapping("/{id}/postmortem")
    public PostmortemView postmortem(@PathVariable String id) {
        Incident incident = require(id);
        PostmortemReport report = PostmortemReport.of(incident);
        MonitorDef monitor = definitions.monitor(incident.monitorId()).orElse(null);
        return new PostmortemView(report.incidentId(), report.monitorId(),
                monitor == null ? incident.monitorId() : monitor.name(), monitor == null ? null : monitor.groupId(),
                incident.status().name(), incident.severity().name(), incident.openedAt(), incident.acknowledgedAt(),
                report.acknowledgedBy(), incident.resolvedAt(), seconds(report.timeToAcknowledge()),
                seconds(report.timeToResolve()), incident.ticket(), report.timeline());
    }

    /** BE-34: mean time to acknowledge and to resolve, overall and per group (team). */
    @GetMapping("/summary")
    public SummaryView summary() {
        List<Incident> all = incidents.recent();
        PostmortemReport.Summary overall = PostmortemReport.summarize(all);
        Map<String, List<Incident>> byGroup = all.stream().collect(Collectors.groupingBy(
                i -> definitions.monitor(i.monitorId()).map(MonitorDef::groupId).orElse(""), TreeMap::new,
                Collectors.toList()));
        List<GroupSummary> groups = byGroup.entrySet().stream().map(e -> {
            PostmortemReport.Summary s = PostmortemReport.summarize(e.getValue());
            return new GroupSummary(e.getKey().isEmpty() ? null : e.getKey(), s.incidents(),
                    seconds(s.meanTimeToAcknowledge()), seconds(s.meanTimeToResolve()));
        }).toList();
        return new SummaryView(overall.incidents(), seconds(overall.meanTimeToAcknowledge()),
                seconds(overall.meanTimeToResolve()), groups);
    }

    @PostMapping("/{id}/ack")
    public Incident acknowledge(@PathVariable String id, @RequestBody(required = false) AckRequest body,
                                @RequestHeader(value = Operators.HEADER, required = false) String header,
                                HttpServletRequest request) {
        String operator = Operators.require(header, body == null ? null : body.by());
        Incident incident = incidents.acknowledge(id, operator);
        audit.record(operator, "incident.ack", id, null, request.getRemoteAddr());
        return incident;
    }

    @PostMapping("/{id}/resolve")
    public Incident resolve(@PathVariable String id, @RequestBody(required = false) AckRequest body,
                            @RequestHeader(value = Operators.HEADER, required = false) String header,
                            HttpServletRequest request) {
        String operator = Operators.require(header, body == null ? null : body.by());
        Incident incident = incidents.resolve(id, operator);
        audit.record(operator, "incident.resolve", id, null, request.getRemoteAddr());
        return incident;
    }

    @PostMapping("/{id}/reopen")
    public Incident reopen(@PathVariable String id, @RequestBody(required = false) AckRequest body,
                           @RequestHeader(value = Operators.HEADER, required = false) String header,
                           HttpServletRequest request) {
        String operator = Operators.require(header, body == null ? null : body.by());
        Incident incident = incidents.reopen(id, operator);
        audit.record(operator, "incident.reopen", id, null, request.getRemoteAddr());
        return incident;
    }

    @PostMapping("/{id}/comments")
    public Incident comment(@PathVariable String id, @RequestBody CommentRequest body,
                            @RequestHeader(value = Operators.HEADER, required = false) String header,
                            HttpServletRequest request) {
        String operator = Operators.require(header, body.by());
        Incident incident = incidents.comment(id, operator, body.text());
        audit.record(operator, "incident.comment", id, body.text(), request.getRemoteAddr());
        return incident;
    }

    @PostMapping("/{id}/ticket")
    public Incident ticket(@PathVariable String id, @RequestBody TicketRequest body,
                           @RequestHeader(value = Operators.HEADER, required = false) String header,
                           HttpServletRequest request) {
        String operator = Operators.require(header, body.by());
        Incident incident = incidents.linkTicket(id, operator, body.ticket());
        audit.record(operator, "incident.ticket", id, body.ticket(), request.getRemoteAddr());
        return incident;
    }

    private Incident require(String id) {
        return incidents.find(id).orElseThrow(() -> new NotFoundException("Incident", id));
    }

    private static IncidentStatus parseStatus(String status) {
        try {
            return IncidentStatus.valueOf(status.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("status must be OPEN or RESOLVED");
        }
    }

    private static Long seconds(Duration duration) {
        return duration == null ? null : duration.toSeconds();
    }
}
