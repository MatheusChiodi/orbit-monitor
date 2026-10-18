package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;

/** Level of a condition: when it fails the monitor goes to WARN or DOWN. */
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
