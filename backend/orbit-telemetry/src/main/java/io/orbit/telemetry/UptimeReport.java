package io.orbit.telemetry;

import java.time.Instant;

/**
 * Uptime over the heartbeats available in memory.
 *
 * @param ratio        up / (up + down), NaN without samples
 * @param samples      heartbeats counted (UNKNOWN excluded)
 * @param coverageFrom oldest heartbeat considered; the window may be shorter than requested
 */
public record UptimeReport(double ratio, int samples, Instant coverageFrom) {

    public double percent() {
        return ratio * 100.0;
    }
}
