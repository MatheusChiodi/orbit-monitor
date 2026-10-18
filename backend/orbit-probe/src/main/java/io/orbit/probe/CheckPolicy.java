package io.orbit.probe;

import io.orbit.common.MonitorState;
import io.orbit.monitor.condition.Hysteresis;

/** Per-check evaluation policy: the monitor's current state and its hysteresis ratio. */
public record CheckPolicy(MonitorState previousState, double hysteresisRatio) {

    public static CheckPolicy initial() {
        return new CheckPolicy(MonitorState.UNKNOWN, Hysteresis.DEFAULT_RATIO);
    }
}
