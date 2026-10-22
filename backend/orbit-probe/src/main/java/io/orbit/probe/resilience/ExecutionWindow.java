package io.orbit.probe.resilience;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/**
 * BE-17: optional execution window ("business hours only", "weekdays only"), timezone-aware.
 * A window that ends before it starts crosses midnight (22:00-06:00).
 * The start is inclusive and the end exclusive; equal start and end means the whole day.
 * For a window across midnight, the day that counts is the day the window started on.
 */
public record ExecutionWindow(Set<DayOfWeek> days, LocalTime from, LocalTime to, ZoneId zone) {

    public ExecutionWindow {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        Objects.requireNonNull(zone, "zone");
        days = days == null || days.isEmpty() ? EnumSet.allOf(DayOfWeek.class) : EnumSet.copyOf(days);
    }

    public boolean isOpen(Instant instant) {
        ZonedDateTime local = instant.atZone(zone);
        LocalTime time = local.toLocalTime();
        DayOfWeek day = local.getDayOfWeek();
        if (from.equals(to)) {
            return days.contains(day);
        }
        if (from.isBefore(to)) {
            return days.contains(day) && !time.isBefore(from) && time.isBefore(to);
        }
        if (!time.isBefore(from)) {
            return days.contains(day);
        }
        return time.isBefore(to) && days.contains(day.minus(1));
    }
}
