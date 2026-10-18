package io.orbit.telemetry;

import io.orbit.common.MonitorState;

import java.time.Instant;

/** One check outcome kept in memory: state, latency and time. No probe payload is ever stored here. */
public record Heartbeat(String monitorId, MonitorState state, long latencyMs, Instant at) {
}
