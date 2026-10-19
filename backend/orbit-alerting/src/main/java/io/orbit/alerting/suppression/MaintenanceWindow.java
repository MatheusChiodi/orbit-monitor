package io.orbit.alerting.suppression;

import io.orbit.config.ConfigItem;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

/**
 * BE-31: maintenance windows (orbit.maintenance.json), one-off ({@code start}/{@code end}) or recurring
 * (5-field cron for the start plus a duration). Active windows silence alerts and are left out of uptime.
 *
 * @param targets monitor or group ids covered by the window
 */
public record MaintenanceWindow(String id, String name, List<String> targets, Instant start, Instant end,
                                String cron, Duration duration, ZoneId zone, String reason) implements ConfigItem {

    public boolean isActive(Instant now) {
        throw new UnsupportedOperationException("BE-31 maintenance windows are not implemented yet");
    }

    public boolean covers(String target, Instant now) {
        throw new UnsupportedOperationException("BE-31 maintenance windows are not implemented yet");
    }
}
