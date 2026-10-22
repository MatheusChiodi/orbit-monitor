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

    /** Half-open period [from, until) in which {@code person} replaces the rotation. */
    public record Override(String person, Instant from, Instant until) {

        boolean covers(Instant now) {
            return !now.isBefore(from) && now.isBefore(until);
        }
    }

    public OnCallSchedule {
        people = people == null ? List.of() : List.copyOf(people);
        overrides = overrides == null ? List.of() : List.copyOf(overrides);
        if (shift == null || shift.isNegative() || shift.isZero()) {
            throw new IllegalArgumentException("Shift must be positive");
        }
    }

    /** Who is on call at {@code now}; empty before the rotation starts or without people. */
    public Optional<String> onCall(Instant now) {
        Optional<Override> override = activeOverride(now);
        if (override.isPresent()) {
            return Optional.of(override.get().person());
        }
        return shiftIndex(now).map(index -> people.get((int) (index % people.size())));
    }

    /** When the current shift ends (shown on the wall clock block); an active override ends at its own end. */
    public Optional<Instant> shiftEndsAt(Instant now) {
        Optional<Override> override = activeOverride(now);
        if (override.isPresent()) {
            return Optional.of(override.get().until());
        }
        return shiftIndex(now).map(index -> start.plus(shift.multipliedBy(index + 1)));
    }

    private Optional<Override> activeOverride(Instant now) {
        return overrides.stream().filter(o -> o.covers(now)).findFirst();
    }

    private Optional<Long> shiftIndex(Instant now) {
        if (people.isEmpty() || start == null || now.isBefore(start)) {
            return Optional.empty();
        }
        return Optional.of(Duration.between(start, now).toMillis() / shift.toMillis());
    }
}
