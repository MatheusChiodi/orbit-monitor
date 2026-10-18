package io.orbit.common.event;

import io.orbit.common.MonitorState;

import java.time.Instant;

/**
 * Domain event: a monitor's confirmed state changed.
 *
 * @param since when the new state actually began (first failing check for a confirmed DOWN)
 * @param at    when the change was confirmed
 */
public record MonitorStateChanged(String monitorId, MonitorState previous, MonitorState current, Instant since,
                                  Instant at) {
}
