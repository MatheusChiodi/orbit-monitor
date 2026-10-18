package io.orbit.common.event;

/** Port for reacting to confirmed state changes (alerting, wall push) without coupling domains. */
@FunctionalInterface
public interface StateChangeListener {

    void onStateChanged(MonitorStateChanged event);
}
