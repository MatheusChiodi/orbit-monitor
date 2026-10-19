package io.orbit.probe.resilience;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Set;

/**
 * BE-17: optional execution window ("business hours only", "weekdays only"), timezone-aware.
 * A window that ends before it starts crosses midnight (22:00-06:00).
 */
public record ExecutionWindow(Set<DayOfWeek> days, LocalTime from, LocalTime to, ZoneId zone) {

    public boolean isOpen(Instant instant) {
        throw new UnsupportedOperationException("BE-17 execution windows are not implemented yet");
    }
}
