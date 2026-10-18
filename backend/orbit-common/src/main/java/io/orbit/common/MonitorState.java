package io.orbit.common;

import java.util.Collection;

/**
 * Estado de saúde de um monitor ou grupo, em ordem crescente de gravidade.
 * UNKNOWN significa "ainda sem dados" e fica entre OK e WARN.
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

    /** Pior estado da coleção; coleção vazia resulta em UNKNOWN. */
    public static MonitorState worstOf(Collection<MonitorState> states) {
        return states.stream().reduce(MonitorState::worst).orElse(UNKNOWN);
    }
}
