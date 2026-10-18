package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;

/** Nível de uma condição: se ela falhar, o monitor vai para atenção (WARN) ou fora (DOWN). */
public enum Severity {
    WARN(MonitorState.WARN),
    DOWN(MonitorState.DOWN);

    private final MonitorState stateOnFailure;

    Severity(MonitorState stateOnFailure) {
        this.stateOnFailure = stateOnFailure;
    }

    public MonitorState stateOnFailure() {
        return stateOnFailure;
    }
}
