package io.orbit.api.runtime;

import java.time.Instant;
import java.util.List;

/**
 * Informational runtime event that is not a state change, such as a certificate crossing the 30, 14
 * or 7-day warning step (BE-05). {@code key} is a message key in messages*.properties; the wall,
 * the history log and notification channels render it in their own language.
 *
 * @param type stable event type, e.g. {@code cert.warning}
 */
public record Notice(String type, String monitorId, String key, List<Object> args, Instant at) {

    public Notice {
        args = args == null ? List.of() : List.copyOf(args);
    }
}
