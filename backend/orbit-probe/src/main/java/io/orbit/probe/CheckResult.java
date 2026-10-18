package io.orbit.probe;

import io.orbit.common.MonitorState;
import io.orbit.monitor.condition.ConditionResult;

import java.time.Instant;
import java.util.List;

/**
 * Outcome of one check after condition evaluation and redaction. Everything here is already
 * masked and safe to keep in memory, publish on the wall or return from the API.
 *
 * @param payload masked {@code ResultPayload} or {@code HttpResponseSnapshot}; null when the check failed
 * @param error   failure reason (timeout, blocked target, SQL error); null on success
 */
public record CheckResult(
        String monitorId,
        MonitorState state,
        long latencyMs,
        Object payload,
        List<ConditionResult> conditions,
        String error,
        Instant checkedAt) {

    public CheckResult {
        conditions = List.copyOf(conditions);
    }
}
