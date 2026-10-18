package io.orbit.alerting;

/** No incident with the given id (it may have expired from memory). */
public class IncidentNotFoundException extends RuntimeException {

    public IncidentNotFoundException(String id) {
        super("Incident not found: " + id);
    }
}
