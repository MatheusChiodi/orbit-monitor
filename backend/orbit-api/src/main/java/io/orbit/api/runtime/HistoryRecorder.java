package io.orbit.api.runtime;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.history.HistoryEvent;
import io.orbit.history.HistorySample;
import io.orbit.history.store.HistoryStore;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckResult;

/**
 * Feeds the 30-day history store from the event bus: every finished check (state, latency, primary
 * value, error code), confirmed state changes and incident timeline steps. Only already masked data
 * reaches here; payloads are never stored. Writes are queued and never block the probes.
 */
public class HistoryRecorder {

    private final HistoryStore store;
    private final MonitorDefinitions definitions;

    public HistoryRecorder(HistoryStore store, MonitorDefinitions definitions) {
        this.store = store;
        this.definitions = definitions;
    }

    public void subscribe(EventBus bus) {
        bus.onCheck(this::onCheck);
        bus.onStateChange(this::onStateChanged);
        bus.onIncident(this::onIncident);
        bus.onNotice(this::onNotice);
    }

    void onCheck(CheckResult result) {
        Double value = definitions.monitor(result.monitorId())
                .map(def -> PrimaryValue.of(def, result).value()).orElse(null);
        store.record(new HistorySample(result.monitorId(), result.checkedAt(), result.state(), result.latencyMs(),
                value, errorCode(result.error())));
        // BE-19/BE-23: series fields (masked, never card data) go to the series stream with their rollups.
        result.metrics().forEach((field, point) -> store.recordSeries(new HistorySample(
                HistorySample.seriesKey(result.monitorId(), field), result.checkedAt(), result.state(),
                result.latencyMs(), point)));
    }

    void onNotice(Notice notice) {
        store.record(new HistoryEvent(notice.at(), notice.type(), notice.monitorId(), null,
                notice.key() + " " + notice.args()));
    }

    void onStateChanged(MonitorStateChanged change) {
        store.record(new HistoryEvent(change.at(), "state.change", change.monitorId(), null,
                change.previous() + " -> " + change.current()));
    }

    void onIncident(Incident incident) {
        if (incident.events().isEmpty()) {
            return;
        }
        IncidentEvent last = incident.events().getLast();
        store.record(new HistoryEvent(last.at(), "incident." + last.type().name().toLowerCase(),
                incident.monitorId(), last.actor(), last.detail()));
    }

    /** Short, stable code from the probe error ("TIMEOUT", "SqlTimeoutException"), never free text. */
    static String errorCode(String error) {
        if (error == null || error.isBlank()) {
            return null;
        }
        String head = error.strip().split("[\\s:]", 2)[0];
        return head.length() > 40 ? head.substring(0, 40) : head;
    }
}
