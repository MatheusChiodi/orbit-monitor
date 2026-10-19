package io.orbit.api.web;

import io.orbit.alerting.escalation.EscalationPolicy;
import io.orbit.config.ConfigFile;
import io.orbit.security.audit.AuditLog;
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

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/** Escalation policies (orbit.escalation.json): timed steps bound to groups. */
@RestController
@RequestMapping("/api/escalation")
public class EscalationController {

    /** @param afterMinutes minutes after the incident opened */
    public record StepRequest(int afterMinutes, List<String> channelIds) {
    }

    public record PolicyRequest(String name, List<StepRequest> steps, List<String> groupIds) {
    }

    private final ConfigFile<EscalationPolicy> file;
    private final AuditLog audit;

    public EscalationController(ConfigFile<EscalationPolicy> file, AuditLog audit) {
        this.file = file;
        this.audit = audit;
    }

    @GetMapping
    public List<EscalationPolicy> list() {
        return file.items();
    }

    @PutMapping("/{id}")
    public synchronized EscalationPolicy save(@PathVariable String id, @RequestBody PolicyRequest body,
                                              @RequestHeader(value = Operators.HEADER, required = false) String header,
                                              HttpServletRequest request) {
        String operator = Operators.require(header, null);
        List<EscalationPolicy.Step> steps = (body.steps() == null ? List.<StepRequest>of() : body.steps()).stream()
                .map(s -> new EscalationPolicy.Step(Duration.ofMinutes(s.afterMinutes()), s.channelIds()))
                .toList();
        EscalationPolicy policy = new EscalationPolicy(id, body.name(), steps, body.groupIds());
        List<EscalationPolicy> items = new ArrayList<>(file.items().stream().filter(p -> !p.id().equals(id)).toList());
        items.add(policy);
        file.save(items);
        audit.record(operator, "escalation.save", id, body.name(), request.getRemoteAddr());
        return policy;
    }

    @DeleteMapping("/{id}")
    public synchronized ResponseEntity<Void> delete(@PathVariable String id,
                                                    @RequestHeader(value = Operators.HEADER, required = false)
                                                    String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        List<EscalationPolicy> remaining = file.items().stream().filter(p -> !p.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            throw new NotFoundException("Escalation policy", id);
        }
        file.save(remaining);
        audit.record(operator, "escalation.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
