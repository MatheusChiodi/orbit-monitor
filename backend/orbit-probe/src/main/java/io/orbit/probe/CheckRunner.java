package io.orbit.probe;

import io.orbit.common.MonitorState;
import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.condition.Evaluation;
import io.orbit.monitor.condition.EvaluationContext;
import io.orbit.monitor.condition.Placeholder;
import io.orbit.monitor.http.HttpEvaluationContext;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.http.MetricExtractor;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.SqlEvaluationContext;
import io.orbit.monitor.sql.UnsafeSqlException;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.multistep.MultiStepHttpProbe;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.probe.sql.SqlProbeException;
import io.orbit.probe.sql.SqlProbeOptions;

import javax.sql.DataSource;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Runs one check end to end: execute the probe, evaluate conditions on the raw result in memory,
 * then redact. This is the probe boundary: raw values never escape this class.
 * A failed check (timeout, blocked target, SQL error) is DOWN with the reason in {@code error}.
 */
public class CheckRunner {

    private final HttpProbe httpProbe;
    private final SqlProbe sqlProbe;
    private final ConditionEngine engine;
    private final PayloadRedactor redactor;
    private final Clock clock;

    public CheckRunner(HttpProbe httpProbe, SqlProbe sqlProbe, ConditionEngine engine, PayloadRedactor redactor,
                       Clock clock) {
        this.httpProbe = httpProbe;
        this.sqlProbe = sqlProbe;
        this.engine = engine;
        this.redactor = redactor;
        this.clock = clock;
    }

    public CheckResult runHttp(String monitorId, HttpProbeRequest request, List<Condition> conditions) {
        return runHttp(monitorId, request, conditions, CheckPolicy.initial());
    }

    public CheckResult runHttp(String monitorId, HttpProbeRequest request, List<Condition> conditions,
                               CheckPolicy policy) {
        return runHttp(monitorId, request, conditions, policy, List.of());
    }

    /** @param metricPaths BE-23: JSONPaths whose numeric values are kept as series */
    public CheckResult runHttp(String monitorId, HttpProbeRequest request, List<Condition> conditions,
                               CheckPolicy policy, List<String> metricPaths) {
        long start = System.nanoTime();
        try {
            return evaluateHttp(monitorId, httpProbe.execute(request), conditions, policy, metricPaths, null);
        } catch (HttpProbeException | SsrfBlockedException | IllegalArgumentException e) {
            return failure(monitorId, e.getMessage(), elapsedMs(start));
        }
    }

    /**
     * BE-07: runs the steps in order (the last one is the monitored request) and evaluates the
     * conditions on the last response; the latency is the sum of all steps.
     */
    public CheckResult runSteps(String monitorId, MultiStepHttpProbe probe, List<MultiStepHttpProbe.Step> steps,
                                List<Condition> conditions, CheckPolicy policy, List<String> metricPaths) {
        long start = System.nanoTime();
        MultiStepHttpProbe.Result result = probe.execute(steps);
        if (result.failedStep() != null || result.responses().isEmpty()) {
            String step = result.failedStep() == null ? "" : "Step '" + result.failedStep() + "' failed: ";
            return failure(monitorId, step + result.error(), elapsedMs(start));
        }
        HttpResponseSnapshot last = result.responses().getLast();
        HttpResponseSnapshot total = new HttpResponseSnapshot(last.status(), result.totalMs(), last.body(),
                last.headers(), last.certDaysLeft());
        return evaluateHttp(monitorId, total, conditions, policy, metricPaths, null);
    }

    private CheckResult evaluateHttp(String monitorId, HttpResponseSnapshot raw, List<Condition> conditions,
                                     CheckPolicy policy, List<String> metricPaths, String error) {
        Evaluation evaluation = engine.evaluateAll(conditions, new HttpEvaluationContext(raw),
                policy.previousState(), policy.hysteresisRatio());
        Map<String, Double> metrics = MetricExtractor.extract(raw.body(), metricPaths);
        return success(monitorId, evaluation, raw.responseTimeMs(), redactor.redact(raw)).withMetrics(metrics);
    }

    /**
     * Outcome of a DNS, certificate, gRPC or Kafka check before conditions.
     *
     * @param baseState state the probe itself decided (expected DNS answer missing, NOT_SERVING, expiry)
     * @param error     the check could not run (DOWN, conditions not evaluated)
     * @param reason    why {@code baseState} is not OK
     * @param values    named values for conditions: {@code [CERT_DAYS_LEFT]} or {@code [COL].NAME}
     */
    public record Measurement(MonitorState baseState, long latencyMs, String error, String reason,
                              Map<String, Object> values) {
    }

    public CheckResult runMeasured(String monitorId, Measurement m, List<Condition> conditions, CheckPolicy policy) {
        if (m.error() != null) {
            return failure(monitorId, m.error(), m.latencyMs());
        }
        Map<String, Object> values = m.values() == null ? Map.of() : m.values();
        EvaluationContext context = (placeholder, path) -> switch (placeholder) {
            case RESPONSE_TIME, EXEC_TIME -> Optional.of(m.latencyMs());
            case CERT_DAYS_LEFT -> Optional.ofNullable(values.get("CERT_DAYS_LEFT"));
            case COL, BODY -> Optional.ofNullable(values.get(path == null ? "BODY" : path));
            case ROWS -> Optional.ofNullable(values.get("ROWS"));
            default -> Optional.empty();
        };
        Evaluation evaluation = engine.evaluateAll(conditions, context, policy.previousState(), policy.hysteresisRatio());
        MonitorState state = MonitorState.worst(evaluation.state(), m.baseState() == null ? MonitorState.OK
                : m.baseState());
        Map<String, Object> masked = new LinkedHashMap<>();
        Map<String, Double> metrics = new LinkedHashMap<>();
        values.forEach((k, v) -> {
            masked.put(k, v instanceof String text ? redactor.redactText(text) : v);
            if (v instanceof Number n && Double.isFinite(n.doubleValue())) {
                metrics.put(k, n.doubleValue());
            }
        });
        String reason = state == MonitorState.OK || m.reason() == null ? null : redactor.redactText(m.reason());
        return new CheckResult(monitorId, state, m.latencyMs(), masked,
                evaluation.results().stream().map(redactor::redact).toList(), reason, clock.instant(), metrics);
    }

    public CheckResult runSql(String monitorId, DataSource dataSource, Dialect dialect, String sql,
                              SqlProbeOptions options, List<Condition> conditions) {
        return runSql(monitorId, dataSource, dialect, sql, options, conditions, CheckPolicy.initial());
    }

    public CheckResult runSql(String monitorId, DataSource dataSource, Dialect dialect, String sql,
                              SqlProbeOptions options, List<Condition> conditions, CheckPolicy policy) {
        return runSql(monitorId, dataSource, dialect, sql, Map.of(), options, conditions, policy);
    }

    /** BE-11 / BE-39: the SELECT with its named parameters, already resolved by the caller. */
    public CheckResult runSql(String monitorId, DataSource dataSource, Dialect dialect, String sql,
                              Map<String, Object> params, SqlProbeOptions options, List<Condition> conditions,
                              CheckPolicy policy) {
        long start = System.nanoTime();
        try {
            ResultPayload raw = params == null || params.isEmpty()
                    ? sqlProbe.execute(dataSource, dialect, sql, options)
                    : sqlProbe.execute(dataSource, dialect, sql, params, options);
            Evaluation evaluation = engine.evaluateAll(conditions, new SqlEvaluationContext(raw),
                    policy.previousState(), policy.hysteresisRatio());
            return success(monitorId, evaluation, raw.ms(), redactor.redact(raw));
        } catch (SqlProbeException | UnsafeSqlException e) {
            return failure(monitorId, e.getMessage(), elapsedMs(start));
        }
    }

    private CheckResult success(String monitorId, Evaluation evaluation, long latencyMs, Object maskedPayload) {
        return new CheckResult(monitorId, evaluation.state(), latencyMs, maskedPayload,
                evaluation.results().stream().map(redactor::redact).toList(), null, clock.instant());
    }

    /** Outcome of a TCP, ping or push check: reachable, round-trip time and the reason when not. */
    public record Reachability(boolean up, long latencyMs, String error) {
    }

    /** TCP/ping: DOWN when unreachable, otherwise conditions on {@code [RESPONSE_TIME]} decide. */
    public CheckResult runReachability(String monitorId, Reachability outcome, List<Condition> conditions,
                                       CheckPolicy policy) {
        if (!outcome.up()) {
            return failure(monitorId, outcome.error(), outcome.latencyMs());
        }
        EvaluationContext context = (placeholder, path) -> placeholder == Placeholder.RESPONSE_TIME
                ? java.util.Optional.of(outcome.latencyMs()) : java.util.Optional.empty();
        Evaluation evaluation = engine.evaluateAll(conditions, context, policy.previousState(), policy.hysteresisRatio());
        return success(monitorId, evaluation, outcome.latencyMs(), null);
    }

    /** No data yet (push monitor before its first signal). */
    public CheckResult unknown(String monitorId) {
        return new CheckResult(monitorId, MonitorState.UNKNOWN, 0, null, List.of(), null, clock.instant());
    }

    /** A check that could not even start (missing secret, unknown connection): DOWN with the reason. */
    public CheckResult failed(String monitorId, String reason) {
        return failure(monitorId, reason, 0);
    }

    private CheckResult failure(String monitorId, String reason, long latencyMs) {
        String error = reason == null ? "Check failed" : redactor.redactText(reason);
        return new CheckResult(monitorId, MonitorState.DOWN, latencyMs, null, List.of(), error, clock.instant());
    }

    private static long elapsedMs(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }
}
