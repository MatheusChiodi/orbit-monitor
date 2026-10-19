package io.orbit.history;

import java.time.Instant;

/** Period the store can answer for ("History available: last 30 days"); {@code oldest} is null when empty. */
public record HistoryCoverage(Instant oldest, Instant newest, int retentionDays, boolean rawWritesEnabled) {
}
