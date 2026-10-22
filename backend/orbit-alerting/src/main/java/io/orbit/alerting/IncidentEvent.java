package io.orbit.alerting;

import java.time.Instant;

/**
 * One timeline entry.
 *
 * @param actor client kind ({@code loopback}, {@code lan}; older data may hold a name), or {@link Incident#SYSTEM_ACTOR} for automatic events
 */
public record IncidentEvent(IncidentEventType type, String actor, Instant at, String detail) {
}
