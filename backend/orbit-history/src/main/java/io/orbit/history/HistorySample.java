package io.orbit.history;

import io.orbit.common.MonitorState;

import java.time.Instant;
import java.util.Objects;

/**
 * One stored sample: a check result (key = monitor id) or a series point (key = {@code monitorId/fieldId}).
 * Values must already be redacted at the probe boundary; {@code error} is a short code such as
 * {@code TIMEOUT}, never free text.
 */
public record HistorySample(String key, Instant at, MonitorState state, long latencyMs, Double value, String error) {

    /** Latencies are clamped to one hour; no check timeout is longer. */
    public static final long MAX_LATENCY_MS = 3_600_000;

    public HistorySample {
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(at, "at");
        state = state == null ? MonitorState.UNKNOWN : state;
        latencyMs = Math.max(0, Math.min(latencyMs, MAX_LATENCY_MS));
        value = value == null || value.isNaN() || value.isInfinite() ? null : value;
    }

    public HistorySample(String key, Instant at, MonitorState state, long latencyMs, Double value) {
        this(key, at, state, latencyMs, value, null);
    }

    public static String seriesKey(String monitorId, String fieldId) {
        return monitorId + "/" + fieldId;
    }
}
