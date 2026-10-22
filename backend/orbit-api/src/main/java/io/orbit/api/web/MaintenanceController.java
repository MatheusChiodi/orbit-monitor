package io.orbit.api.web;

import io.orbit.alerting.suppression.MaintenanceSchedule;
import io.orbit.alerting.suppression.MaintenanceWindow;
import io.orbit.config.ConfigFile;
import io.orbit.security.audit.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/** BE-31: maintenance windows (orbit.maintenance.json): one-off or recurring (cron), silence alerts and uptime. */
@RestController
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    /** One-off: {@code start}/{@code end}; recurring: {@code cron} (5 fields) + {@code durationMinutes} in {@code zone}. */
    public record MaintenanceRequest(String name, List<String> targets, Instant start, Instant end, String cron,
                                     Integer durationMinutes, String zone, String reason) {
    }

    public record MaintenanceView(String id, String name, List<String> targets, Instant start, Instant end,
                                  String cron, Long durationMinutes, String zone, String reason, boolean active) {
    }

    private final ConfigFile<MaintenanceWindow> file;
    private final MaintenanceSchedule schedule;
    private final AuditLog audit;
    private final Clock clock;

    public MaintenanceController(ConfigFile<MaintenanceWindow> file, MaintenanceSchedule schedule, AuditLog audit,
                                 Clock clock) {
        this.file = file;
        this.schedule = schedule;
        this.audit = audit;
        this.clock = clock;
    }

    @GetMapping
    public List<MaintenanceView> list() {
        Instant now = clock.instant();
        return file.items().stream().map(w -> view(w, now)).toList();
    }

    @GetMapping("/active")
    public List<MaintenanceView> active() {
        Instant now = clock.instant();
        return file.items().stream().filter(w -> w.isActive(now)).map(w -> view(w, now)).toList();
    }

    /** Calendar (FE-41): occurrences in {@code [from, to)}, default the next 7 days, at most 62 days. */
    @GetMapping("/occurrences")
    public List<MaintenanceSchedule.Scheduled> occurrences(@RequestParam(required = false) Instant from,
                                                           @RequestParam(required = false) Instant to) {
        Instant start = from == null ? clock.instant() : from;
        Instant end = to == null ? start.plus(Duration.ofDays(7)) : to;
        return schedule.occurrences(start, end);
    }

    @PutMapping("/{id}")
    public synchronized MaintenanceView save(@PathVariable String id, @RequestBody MaintenanceRequest body,
                                             HttpServletRequest request) {
        String operator = Actors.current();
        MaintenanceWindow window = new MaintenanceWindow(id, body.name(), body.targets(), body.start(), body.end(),
                body.cron() == null || body.cron().isBlank() ? null : body.cron().strip(),
                body.durationMinutes() == null ? null : Duration.ofMinutes(body.durationMinutes()), zone(body.zone()),
                body.reason());
        List<MaintenanceWindow> items = new ArrayList<>(file.items().stream().filter(w -> !w.id().equals(id)).toList());
        items.add(window);
        file.save(items);
        audit.record(operator, "maintenance.save", id, body.name(), request.getRemoteAddr());
        return view(window, clock.instant());
    }

    @DeleteMapping("/{id}")
    public synchronized ResponseEntity<Void> delete(@PathVariable String id,
                                                    HttpServletRequest request) {
        String operator = Actors.current();
        List<MaintenanceWindow> remaining = file.items().stream().filter(w -> !w.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            throw new NotFoundException("Maintenance window", id);
        }
        file.save(remaining);
        audit.record(operator, "maintenance.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private static ZoneId zone(String zone) {
        if (zone == null || zone.isBlank()) {
            return null;
        }
        try {
            return ZoneId.of(zone.strip());
        } catch (DateTimeException e) {
            throw new IllegalArgumentException("Unknown time zone: " + zone);
        }
    }

    private static MaintenanceView view(MaintenanceWindow w, Instant now) {
        return new MaintenanceView(w.id(), w.name(), w.targets(), w.start(), w.end(), w.cron(),
                w.duration() == null ? null : w.duration().toMinutes(), w.zone().getId(), w.reason(), w.isActive(now));
    }
}
