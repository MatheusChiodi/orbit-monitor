package io.orbit.alerting;

/** Port notified on every incident change (wall push, notification channels). */
@FunctionalInterface
public interface IncidentListener {

    void onIncident(Incident incident);
}
