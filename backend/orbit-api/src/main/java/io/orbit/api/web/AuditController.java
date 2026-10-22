package io.orbit.api.web;

import io.orbit.alerting.IncidentService;
import io.orbit.security.audit.AuditEntry;
import io.orbit.security.audit.AuditLog;
import io.orbit.security.audit.AuditQuery;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    @GetMapping("/api/audit")
    public List<AuditEntry> query(@RequestParam(required = false) String action,
                                  @RequestParam(required = false) String target,
                                  @RequestParam(required = false) String operator) {
        return audit.query(new AuditQuery(action, target, operator));
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
