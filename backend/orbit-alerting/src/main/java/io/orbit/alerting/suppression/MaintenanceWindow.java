package io.orbit.alerting.suppression;

import io.orbit.config.ConfigItem;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
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
}
