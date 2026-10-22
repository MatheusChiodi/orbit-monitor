package io.orbit.api.web;

import io.orbit.alerting.suppression.SilenceService;
import io.orbit.security.audit.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Duration;
import java.util.List;

/** Silences/snoozes (orbit.silences.json) for a monitor or group, with reason and expiry. */
@RestController
@RequestMapping("/api/silences")
public class SilenceController {

    /** @param minutes how long the silence lasts (1 minute to 7 days) */
    public record SilenceRequest(String target, String reason, Integer minutes) {
    }

    private final SilenceService silences;
    private final AuditLog audit;
    private final Clock clock;

    public SilenceController(SilenceService silences, AuditLog audit, Clock clock) {
        this.silences = silences;
        this.audit = audit;
        this.clock = clock;
    }

    @GetMapping
    public List<SilenceService.Silence> active() {
        return silences.active();
    }

    @PostMapping
    public SilenceService.Silence create(@RequestBody SilenceRequest body,
                                         HttpServletRequest request) {
        String operator = Actors.current();
        int minutes = body.minutes() == null ? 60 : body.minutes();
        if (minutes < 1 || minutes > 7 * 24 * 60) {
            throw new IllegalArgumentException("minutes must be between 1 and 10080");
        }
        SilenceService.Silence silence = silences.silence(body.target(), body.reason(), operator,
                clock.instant().plus(Duration.ofMinutes(minutes)));
        audit.record(operator, "silence.create", body.target(), body.reason(), request.getRemoteAddr());
        return silence;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> lift(@PathVariable String id,
                                     HttpServletRequest request) {
        String operator = Actors.current();
        if (!silences.lift(id, operator)) {
            throw new NotFoundException("Silence", id);
        }
        audit.record(operator, "silence.lift", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
