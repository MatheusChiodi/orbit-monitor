package io.orbit.api.runtime;

import io.orbit.api.wall.WallViews;
import io.orbit.common.MonitorState;
import io.orbit.telemetry.Heartbeat;
import io.orbit.telemetry.MonitorStatus;
import io.orbit.telemetry.Statistics;
import io.orbit.telemetry.TelemetryService;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;

import java.time.Clock;
import java.time.Instant;

/**
 * BE-50: Orbit monitors itself. The built-in {@code orbit_self} monitor reads the in-process
 * {@code /actuator/health} result (no HTTP round trip, nothing leaves the machine) and records a
 * heartbeat like any other monitor, so the wall shows when Orbit itself is degraded.
 */
public class SelfMonitor {

    public static final String ID = "orbit_self";
    public static final String NAME = "Orbit";
    private static final int SERIES_MINUTES = 60;

    private final HealthEndpoint health;
    private final TelemetryService telemetry;
    private final Clock clock;

    public SelfMonitor(HealthEndpoint health, TelemetryService telemetry, Clock clock) {
        this.health = health;
        this.telemetry = telemetry;
        this.clock = clock;
    }

    /** Runs the health check and records it; returns the resulting state. */
    public MonitorState check() {
        long started = System.nanoTime();
        MonitorState state;
        try {
            Status status = health.health().getStatus();
            state = Status.UP.equals(status) ? MonitorState.OK
                    : Status.UNKNOWN.equals(status) ? MonitorState.WARN : MonitorState.DOWN;
        } catch (RuntimeException e) {
            state = MonitorState.DOWN;
        }
        long latencyMs = (System.nanoTime() - started) / 1_000_000;
        telemetry.record(new Heartbeat(ID, state, latencyMs, clock.instant()), 1);
        return state;
    }

    /** The self monitor as the console and wall list it (always first). */
    public WallViews.MonitorView view() {
        MonitorStatus status = telemetry.status(ID);
        Instant now = clock.instant();
        return new WallViews.MonitorView(ID, NAME, null, "SELF", status.state().name(),
                status.lastLatencyMs() == null ? null : status.lastLatencyMs().doubleValue(), "ms", null,
                status.since(), Statistics.minuteSeries(status.history(), now, SERIES_MINUTES), status.lastCheckAt(),
                status.state() == MonitorState.DOWN ? "Orbit health check is not UP" : null);
    }
}
