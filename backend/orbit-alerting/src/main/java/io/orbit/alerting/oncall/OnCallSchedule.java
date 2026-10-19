package io.orbit.alerting.oncall;

import io.orbit.config.ConfigItem;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * BE-33: rotation of people (orbit.oncall.json): each takes a shift of {@code shift} starting at
 * {@code start}, in order, wrapping around. Overrides replace the rotation for a period.
 */
public record OnCallSchedule(String id, String name, List<String> people, Instant start, Duration shift,
                             List<Override> overrides) implements ConfigItem {

    public record Override(String person, Instant from, Instant until) {
    }

    /** Who is on call at {@code now}; empty before the rotation starts or without people. */
    public Optional<String> onCall(Instant now) {
        throw new UnsupportedOperationException("BE-33 on-call schedules are not implemented yet");
    }

    /** When the current shift ends (shown on the wall clock block). */
    public Optional<Instant> shiftEndsAt(Instant now) {
        throw new UnsupportedOperationException("BE-33 on-call schedules are not implemented yet");
    }
}
