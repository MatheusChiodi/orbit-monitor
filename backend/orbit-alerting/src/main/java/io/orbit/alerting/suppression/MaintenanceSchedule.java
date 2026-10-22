package io.orbit.alerting.suppression;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.function.Supplier;

/**
 * BE-31: the maintenance windows of orbit.maintenance.json as a schedule: whether a monitor or group is
 * in maintenance now (alert silencing), the past occurrences to leave out of uptime (BE-20) and the
 * occurrences of a period for the console calendar (FE-41).
 */
public class MaintenanceSchedule {

    /** One occurrence of a window. */
    public record Scheduled(String windowId, String name, List<String> targets, String reason, Instant start,
                            Instant end) {
    }

    private final Supplier<List<MaintenanceWindow>> windows;

    public MaintenanceSchedule(Supplier<List<MaintenanceWindow>> windows) {
        this.windows = windows;
    }

    /** True when any of {@code targets} (a monitor id and its group id) is in an active window. */
    public boolean inMaintenance(List<String> targets, Instant now) {
        return windows.get().stream().anyMatch(w -> targets.stream().anyMatch(t -> w.covers(t, now)));
    }

    /** Occurrences of the windows covering any of {@code targets} within {@code [from, to)}; clamped to 62 days. */
    public List<MaintenanceWindow.Occurrence> exclusions(List<String> targets, Instant from, Instant to) {
        Instant start = clamp(from, to);
        return windows.get().stream()
                .filter(w -> w.targets().stream().anyMatch(targets::contains))
                .flatMap(w -> w.occurrences(start, to).stream())
                .toList();
    }

    /** Every occurrence within {@code [from, to)}, by start (at most 62 days). */
    public List<Scheduled> occurrences(Instant from, Instant to) {
        return windows.get().stream()
                .flatMap(w -> w.occurrences(from, to).stream()
                        .map(o -> new Scheduled(w.id(), w.name(), w.targets(), w.reason(), o.start(), o.end())))
                .sorted(Comparator.comparing(Scheduled::start).thenComparing(Scheduled::windowId))
                .toList();
    }

    private static Instant clamp(Instant from, Instant to) {
        Instant earliest = to.minus(MaintenanceWindow.MAX_PERIOD);
        return from.isBefore(earliest) ? earliest : from;
    }

    /** Half-open check used by tests and callers that already hold the occurrences. */
    public static boolean within(List<MaintenanceWindow.Occurrence> occurrences, Instant at) {
        return occurrences.stream().anyMatch(o -> !at.isBefore(o.start()) && at.isBefore(o.end()));
    }
}
