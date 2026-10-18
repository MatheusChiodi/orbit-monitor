package io.orbit.api.web;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.security.audit.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Incidents in memory: list, details with timeline, acknowledge, comment and link a ticket. */
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

    private final IncidentService incidents;
    private final AuditLog audit;

    public IncidentController(IncidentService incidents, AuditLog audit) {
        this.incidents = incidents;
        this.audit = audit;
    }

    @GetMapping
    public List<Incident> list() {
        return incidents.recent();
    }

    @GetMapping("/{id}")
    public Incident get(@PathVariable String id) {
        return incidents.find(id).orElseThrow(() -> new NotFoundException("Incident", id));
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
}
