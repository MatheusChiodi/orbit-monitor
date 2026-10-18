package io.orbit.api.runtime;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentListener;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.common.event.StateChangeListener;
import io.orbit.probe.CheckResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/**
 * In-process fan-out of domain events (state changes, incidents, finished checks). Keeps the
 * domains decoupled and avoids circular wiring; a failing subscriber never blocks the others.
 */
public class EventBus {

    private static final Logger LOG = LoggerFactory.getLogger(EventBus.class);

    private final List<StateChangeListener> stateListeners = new CopyOnWriteArrayList<>();
    private final List<IncidentListener> incidentListeners = new CopyOnWriteArrayList<>();
    private final List<Consumer<CheckResult>> checkListeners = new CopyOnWriteArrayList<>();

    public void onStateChange(StateChangeListener listener) {
        stateListeners.add(listener);
    }

    public void onIncident(IncidentListener listener) {
        incidentListeners.add(listener);
    }

    public void onCheck(Consumer<CheckResult> listener) {
        checkListeners.add(listener);
    }

    public void publish(MonitorStateChanged event) {
        stateListeners.forEach(l -> safely(() -> l.onStateChanged(event)));
    }

    public void publish(Incident incident) {
        incidentListeners.forEach(l -> safely(() -> l.onIncident(incident)));
    }

    public void publish(CheckResult result) {
        checkListeners.forEach(l -> safely(() -> l.accept(result)));
    }

    private static void safely(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            LOG.warn("Event subscriber failed: {}", e.getClass().getSimpleName());
        }
    }
}
