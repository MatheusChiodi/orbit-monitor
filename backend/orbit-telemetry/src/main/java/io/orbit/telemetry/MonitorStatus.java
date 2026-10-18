package io.orbit.telemetry;

import io.orbit.common.MonitorState;

import java.time.Instant;
import java.util.List;

/** Current view of one monitor built from memory: confirmed state, uptime, latency and history. */
public record MonitorStatus(
        String monitorId,
        MonitorState state,
        Instant since,
        Instant lastCheckAt,
        Long lastLatencyMs,
        UptimeReport uptime,
        LatencySummary latency,
        List<Heartbeat> history) {

    public MonitorStatus {
        history = List.copyOf(history);
    }
}
