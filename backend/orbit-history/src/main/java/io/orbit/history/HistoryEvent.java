package io.orbit.history;

import java.time.Instant;
import java.util.Objects;

/**
 * State change, incident step (open / ack / comment / resolve), maintenance or silence.
 * {@code detail} is redacted again before it is written.
 */
public record HistoryEvent(Instant at, String type, String monitorId, String actor, String detail) {

    public HistoryEvent {
        Objects.requireNonNull(at, "at");
        Objects.requireNonNull(type, "type");
    }
}
