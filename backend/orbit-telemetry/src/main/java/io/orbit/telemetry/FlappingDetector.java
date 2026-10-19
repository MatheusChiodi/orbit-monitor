package io.orbit.telemetry;

import io.orbit.common.event.MonitorStateChanged;

import java.time.Duration;

/**
 * BE-25: a monitor that changes state {@code maxChanges} times within {@code window} is FLAPPING;
 * alerting then keeps a single incident instead of one per change.
 */
public class FlappingDetector {

    public FlappingDetector(int maxChanges, Duration window) {
    }

    /** Records a confirmed change; returns whether the monitor is flapping now. */
    public boolean observe(MonitorStateChanged change) {
        throw new UnsupportedOperationException("BE-25 flapping detection is not implemented yet");
    }

    public boolean isFlapping(String monitorId, java.time.Instant now) {
        throw new UnsupportedOperationException("BE-25 flapping detection is not implemented yet");
    }
}
