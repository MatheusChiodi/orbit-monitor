package io.orbit.telemetry;

import java.time.Instant;

/** Half-open interval [start, end), e.g. a maintenance window. */
public record TimeRange(Instant start, Instant end) {

    public boolean contains(Instant instant) {
        return !instant.isBefore(start) && instant.isBefore(end);
    }
}
