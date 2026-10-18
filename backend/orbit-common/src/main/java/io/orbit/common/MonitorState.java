package io.orbit.common;

import java.util.Collection;

/**
 * Health state of a monitor or group, in increasing order of severity.
 * UNKNOWN means "no data yet" and sits between OK and WARN.
 */
public enum MonitorState {
    OK,
    UNKNOWN,
    WARN,
    DOWN;

    public boolean isWorseThan(MonitorState other) {
        return ordinal() > other.ordinal();
    }

    public static MonitorState worst(MonitorState a, MonitorState b) {
        return a.isWorseThan(b) ? a : b;
    }

    /** Worst state in the collection; an empty collection yields UNKNOWN. */
    public static MonitorState worstOf(Collection<MonitorState> states) {
        return states.stream().reduce(MonitorState::worst).orElse(UNKNOWN);
    }
}
