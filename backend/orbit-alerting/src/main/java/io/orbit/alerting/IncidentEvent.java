package io.orbit.alerting;

import java.time.Instant;

/**
 * One timeline entry.
 *
 * @param actor self-declared operator name, or {@link Incident#SYSTEM_ACTOR} for automatic events
 */
public record IncidentEvent(IncidentEventType type, String actor, Instant at, String detail) {
}
