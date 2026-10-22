package io.orbit.api.web;

import io.orbit.alerting.oncall.OnCallSchedule;
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

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** BE-33: on-call schedules (orbit.oncall.json) and "who is on call now" for escalation and the wall clock block. */
@RestController
@RequestMapping("/api/oncall")
public class OnCallController {

    public record OnCallRequest(String name, List<String> people, Instant start, Integer shiftHours,
                                List<OnCallSchedule.Override> overrides) {
    }

    public record OnCallView(String id, String name, List<String> people, Instant start, long shiftHours,
                             List<OnCallSchedule.Override> overrides, String onCallNow, Instant shiftEndsAt) {
    }

    /** One line of the wall clock block: who is on call for a schedule and until when. */
    public record OnCallNow(String scheduleId, String name, String person, Instant shiftEndsAt) {
    }

    private final ConfigFile<OnCallSchedule> file;
    private final AuditLog audit;
    private final Clock clock;

    public OnCallController(ConfigFile<OnCallSchedule> file, AuditLog audit, Clock clock) {
        this.file = file;
        this.audit = audit;
        this.clock = clock;
    }

    @GetMapping
    public List<OnCallView> list() {
        Instant now = clock.instant();
        return file.items().stream().map(s -> view(s, now)).toList();
    }

    @GetMapping("/now")
    public List<OnCallNow> now() {
        Instant now = clock.instant();
        return file.items().stream()
                .flatMap(s -> s.onCall(now).stream()
                        .map(person -> new OnCallNow(s.id(), s.name(), person, s.shiftEndsAt(now).orElse(null))))
                .toList();
    }

    @PutMapping("/{id}")
    public synchronized OnCallView save(@PathVariable String id, @RequestBody OnCallRequest body,
                                        @RequestHeader(value = Operators.HEADER, required = false) String header,
                                        HttpServletRequest request) {
        String operator = Operators.require(header, null);
        int hours = body.shiftHours() == null ? 24 : body.shiftHours();
        if (hours < 1 || hours > 24 * 31) {
            throw new IllegalArgumentException("shiftHours must be between 1 and 744");
        }
        List<String> people = body.people() == null ? List.of()
                : body.people().stream().filter(p -> p != null && !p.isBlank()).map(String::strip).toList();
        OnCallSchedule schedule = new OnCallSchedule(id, body.name(), people, body.start(), Duration.ofHours(hours),
                body.overrides());
        List<OnCallSchedule> items = new ArrayList<>(file.items().stream().filter(s -> !s.id().equals(id)).toList());
        items.add(schedule);
        file.save(items);
        audit.record(operator, "oncall.save", id, body.name(), request.getRemoteAddr());
        return view(schedule, clock.instant());
    }

    @DeleteMapping("/{id}")
    public synchronized ResponseEntity<Void> delete(@PathVariable String id,
                                                    @RequestHeader(value = Operators.HEADER, required = false)
                                                    String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        List<OnCallSchedule> remaining = file.items().stream().filter(s -> !s.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            throw new NotFoundException("On-call schedule", id);
        }
        file.save(remaining);
        audit.record(operator, "oncall.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private static OnCallView view(OnCallSchedule s, Instant now) {
        return new OnCallView(s.id(), s.name(), s.people(), s.start(), s.shift().toHours(), s.overrides(),
                s.onCall(now).orElse(null), s.shiftEndsAt(now).orElse(null));
    }
}
