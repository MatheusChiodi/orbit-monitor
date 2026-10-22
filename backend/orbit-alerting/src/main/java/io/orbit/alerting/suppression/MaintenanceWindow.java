package io.orbit.alerting.suppression;

import io.orbit.config.ConfigItem;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * BE-31: maintenance windows (orbit.maintenance.json), one-off ({@code start}/{@code end}) or recurring
 * (5-field cron for the start plus a duration). Active windows silence alerts and are left out of uptime.
 *
 * @param targets monitor or group ids covered by the window
 */
public record MaintenanceWindow(String id, String name, List<String> targets, Instant start, Instant end,
                                String cron, Duration duration, ZoneId zone, String reason) implements ConfigItem {

    private static final Duration MAX_RECURRING = Duration.ofDays(1);
    /** Longest period {@link #occurrences} looks at (keeps the minute scan of a cron bounded). */
    public static final Duration MAX_PERIOD = Duration.ofDays(62);

    /** One occurrence of the window, half-open {@code [start, end)}. */
    public record Occurrence(Instant start, Instant end) {
    }

    public MaintenanceWindow {
        targets = targets == null ? List.of() : List.copyOf(targets);
        zone = zone == null ? ZoneId.of("UTC") : zone;
    }

    public boolean isActive(Instant now) {
        if (cron == null || cron.isBlank()) {
            return start != null && end != null && !now.isBefore(start) && now.isBefore(end);
        }
        if (duration == null || duration.isZero() || duration.isNegative() || duration.compareTo(MAX_RECURRING) > 0) {
            return false;
        }
        CronExpression expression = CronExpression.parse(cron);
        ZonedDateTime minute = now.atZone(zone).truncatedTo(ChronoUnit.MINUTES);
        ZonedDateTime earliest = now.minus(duration).atZone(zone);
        for (ZonedDateTime t = minute; t.isAfter(earliest); t = t.minusMinutes(1)) {
            if (expression.matches(t)) {
                return now.isBefore(t.toInstant().plus(duration));
            }
        }
        return false;
    }

    public boolean covers(String target, Instant now) {
        return targets.contains(target) && isActive(now);
    }

    private boolean recurring() {
        return cron != null && !cron.isBlank();
    }

    /** Occurrences overlapping {@code [from, to)}, oldest first (BE-20 uptime exclusion, FE-41 calendar). */
    public List<Occurrence> occurrences(Instant from, Instant to) {
        if (!to.isAfter(from) || Duration.between(from, to).compareTo(MAX_PERIOD) > 0) {
            throw new IllegalArgumentException("The period must be positive and at most " + MAX_PERIOD.toDays() + " days");
        }
        List<Occurrence> found = new ArrayList<>();
        if (!recurring()) {
            if (start != null && end != null && start.isBefore(to) && end.isAfter(from)) {
                found.add(new Occurrence(start, end));
            }
            return found;
        }
        if (!problems().isEmpty()) {
            return found;
        }
        CronExpression expression = CronExpression.parse(cron);
        ZonedDateTime t = from.minus(duration).atZone(zone).truncatedTo(ChronoUnit.MINUTES);
        for (; t.toInstant().isBefore(to); t = t.plusMinutes(1)) {
            Instant begin = t.toInstant();
            if (expression.matches(t) && begin.plus(duration).isAfter(from)) {
                found.add(new Occurrence(begin, begin.plus(duration)));
            }
        }
        return found;
    }

    /** What is wrong with this window (empty when valid), prefixed with its id. */
    public List<String> problems() {
        List<String> problems = new ArrayList<>();
        if (targets.isEmpty()) {
            problems.add(id + ": at least one target");
        }
        if (recurring()) {
            try {
                CronExpression.parse(cron);
            } catch (RuntimeException e) {
                problems.add(id + ": invalid cron (" + e.getMessage() + ")");
            }
            if (duration == null || duration.compareTo(Duration.ofMinutes(1)) < 0
                    || duration.compareTo(MAX_RECURRING) > 0) {
                problems.add(id + ": duration must be between 1 minute and 1 day");
            }
        } else if (start == null || end == null) {
            problems.add(id + ": start and end, or cron and duration, are required");
        } else if (!end.isAfter(start)) {
            problems.add(id + ": end must be after start");
        }
        return problems;
    }
}
