package io.orbit.monitor.definition;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * BE-17: optional execution window of a monitor ("weekdays 08:00-18:00 in America/Sao_Paulo").
 * Outside the window scheduled checks are skipped; "Test now" still runs.
 *
 * @param days empty or null means every day ({@code MONDAY} ... {@code SUNDAY})
 * @param from start time {@code HH:mm}, inclusive
 * @param to   end time {@code HH:mm}, exclusive; before {@code from} crosses midnight
 * @param zone IANA time zone; null means UTC
 */
public record WindowDef(List<String> days, String from, String to, String zone) {

    public WindowDef {
        days = days == null ? List.of() : List.copyOf(days);
    }

    /** Problems with this window, empty when valid. */
    public List<String> problems() {
        List<String> problems = new ArrayList<>();
        for (String day : days) {
            try {
                DayOfWeek.valueOf(day == null ? "" : day.toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                problems.add("window: unknown day " + day);
            }
        }
        for (String time : new String[] {from, to}) {
            try {
                LocalTime.parse(time == null ? "" : time);
            } catch (DateTimeParseException e) {
                problems.add("window: time must be HH:mm (" + time + ")");
            }
        }
        if (zone != null) {
            try {
                ZoneId.of(zone);
            } catch (DateTimeException e) {
                problems.add("window: unknown time zone " + zone);
            }
        }
        return problems;
    }

    public List<DayOfWeek> dayOfWeeks() {
        return days.stream().map(d -> DayOfWeek.valueOf(d.toUpperCase(Locale.ROOT))).toList();
    }

    public LocalTime fromTime() {
        return LocalTime.parse(from);
    }

    public LocalTime toTime() {
        return LocalTime.parse(to);
    }

    public ZoneId zoneId() {
        return zone == null ? ZoneId.of("UTC") : ZoneId.of(zone);
    }
}
