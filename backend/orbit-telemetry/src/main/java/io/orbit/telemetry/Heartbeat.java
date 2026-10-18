package io.orbit.telemetry;

import io.orbit.common.MonitorState;

import java.time.Instant;

/**
 * One check outcome kept in memory: state, latency, the monitor's primary numeric value (already
 * masked at the probe boundary; null when absent) and time. No probe payload is stored here.
 */
public record Heartbeat(String monitorId, MonitorState state, long latencyMs, Double value, Instant at) {

    public Heartbeat(String monitorId, MonitorState state, long latencyMs, Instant at) {
        this(monitorId, state, latencyMs, null, at);
    }
}
