package io.orbit.probe;

import io.orbit.common.MonitorState;
import io.orbit.monitor.condition.ConditionResult;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Outcome of one check after condition evaluation and redaction. Everything here is already
 * masked and safe to keep in memory, publish on the wall or return from the API.
 *
 * @param payload masked {@code ResultPayload} or {@code HttpResponseSnapshot}; null when the check failed
 * @param error   failure reason (timeout, blocked target, SQL error); null on success
 * @param metrics numeric values kept as series (BE-23 JSONPath values, Kafka lag, days left); never card data
 */
public record CheckResult(
        String monitorId,
        MonitorState state,
        long latencyMs,
        Object payload,
        List<ConditionResult> conditions,
        String error,
        Instant checkedAt,
        Map<String, Double> metrics) {

    public CheckResult {
        conditions = List.copyOf(conditions);
        metrics = metrics == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(metrics));
    }

    public CheckResult(String monitorId, MonitorState state, long latencyMs, Object payload,
                       List<ConditionResult> conditions, String error, Instant checkedAt) {
        this(monitorId, state, latencyMs, payload, conditions, error, checkedAt, Map.of());
    }

    public CheckResult withMetrics(Map<String, Double> values) {
        return new CheckResult(monitorId, state, latencyMs, payload, conditions, error, checkedAt, values);
    }
}
