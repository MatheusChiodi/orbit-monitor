package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import io.orbit.common.event.StateChangeListener;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/** Records heartbeats, confirms state changes and answers status queries, all in memory. */
public class TelemetryService {

    private final HeartbeatStore store;
    private final StateTracker tracker;
    private final StateChangeListener listener;
    private volatile Function<String, List<TimeRange>> maintenance = monitorId -> List.of();

    public TelemetryService(HeartbeatStore store, StateTracker tracker, StateChangeListener listener) {
        this.store = store;
        this.tracker = tracker;
        this.listener = listener;
    }

    /** BE-20/BE-31: maintenance windows of a monitor (its own and its group's), left out of uptime. */
    public void setMaintenance(Function<String, List<TimeRange>> maintenance) {
        this.maintenance = maintenance;
    }

    /**
     * @param downAfter consecutive failing checks needed to confirm DOWN
     */
    public void record(Heartbeat heartbeat, int downAfter) {
        store.record(heartbeat);
        tracker.observe(heartbeat.monitorId(), heartbeat.state(), downAfter, heartbeat.at())
                .ifPresent(listener::onStateChanged);
    }

    public MonitorState currentState(String monitorId) {
        return tracker.current(monitorId);
    }

    public MonitorStatus status(String monitorId) {
        List<Heartbeat> history = store.history(monitorId);
        Optional<Heartbeat> last = history.isEmpty() ? Optional.empty() : Optional.of(history.getLast());
        return new MonitorStatus(monitorId, tracker.current(monitorId), tracker.since(monitorId).orElse(null),
                last.map(Heartbeat::at).orElse(null), last.map(Heartbeat::latencyMs).orElse(null),
                Statistics.uptime(history, maintenance.apply(monitorId)), Statistics.latency(history), history);
    }

    public void forget(String monitorId) {
        store.forget(monitorId);
        tracker.forget(monitorId);
    }
}
