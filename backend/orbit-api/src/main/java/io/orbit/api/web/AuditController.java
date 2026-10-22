package io.orbit.api.web;

import io.orbit.alerting.IncidentService;
import io.orbit.security.audit.AuditEntry;
import io.orbit.security.audit.AuditLog;
import io.orbit.security.audit.AuditQuery;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;

/** Audit trail query and LGPD anonymization of a self-declared operator name. */
@RestController
public class AuditController {

    public record AnonymizeRequest(String name) {
    }

    /** @param incidents BE-45: incidents whose acknowledgement or timeline carried the name */
    public record AnonymizeResponse(int auditEntries, int incidents) {
    }

    private final AuditLog audit;
    private final IncidentService incidents;

    public AuditController(AuditLog audit, IncidentService incidents) {
        this.audit = audit;
        this.incidents = incidents;
    }

    /**
     * BE-46: entries newest first. Filters: {@code action} (prefix), {@code target}, {@code operator}
     * (substring), {@code from} (inclusive) and {@code to} (exclusive) as ISO-8601 instants. Pagination:
     * {@code offset} (default 0) and {@code limit} (default 100, at most 500); the number of matching
     * entries is in {@code X-Total-Count}. Probe results are never in the audit.
     */
    @GetMapping("/api/audit")
    public ResponseEntity<List<AuditEntry>> query(@RequestParam(required = false) String action,
                                                  @RequestParam(required = false) String target,
                                                  @RequestParam(required = false) String operator,
                                                  @RequestParam(required = false) String from,
                                                  @RequestParam(required = false) String to,
                                                  @RequestParam(defaultValue = "0") int offset,
                                                  @RequestParam(defaultValue = "100") int limit) {
        AuditLog.Page page = audit.page(new AuditQuery(action, target, operator, instant(from, "from"),
                instant(to, "to")), offset, limit);
        return ResponseEntity.ok().header("X-Total-Count", String.valueOf(page.total())).body(page.items());
    }

    private static Instant instant(String value, String name) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(name + " must be an ISO-8601 instant such as 2026-10-18T12:00:00Z");
        }
    }

    @PostMapping("/api/operators/anonymize")
    public AnonymizeResponse anonymize(@RequestBody AnonymizeRequest body,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        String operator = Operators.require(header, null);
        int changed = audit.anonymize(body.name());
        int changedIncidents = incidents.anonymize(body.name());
        audit.record(operator, "operator.anonymize", "operator", null, request.getRemoteAddr());
        return new AnonymizeResponse(changed, changedIncidents);
    }
}
