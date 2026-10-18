package io.orbit.probe;

import io.orbit.common.MonitorState;
import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.condition.Evaluation;
import io.orbit.monitor.http.HttpEvaluationContext;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.SqlEvaluationContext;
import io.orbit.monitor.sql.UnsafeSqlException;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.probe.sql.SqlProbeException;
import io.orbit.probe.sql.SqlProbeOptions;

import javax.sql.DataSource;
import java.time.Clock;
import java.util.List;

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
        long start = System.nanoTime();
        try {
            HttpResponseSnapshot raw = httpProbe.execute(request);
            Evaluation evaluation = engine.evaluateAll(conditions, new HttpEvaluationContext(raw));
            return success(monitorId, evaluation, raw.responseTimeMs(), redactor.redact(raw));
        } catch (HttpProbeException | SsrfBlockedException | IllegalArgumentException e) {
            return failure(monitorId, e.getMessage(), elapsedMs(start));
        }
    }

    public CheckResult runSql(String monitorId, DataSource dataSource, Dialect dialect, String sql,
                              SqlProbeOptions options, List<Condition> conditions) {
        long start = System.nanoTime();
        try {
            ResultPayload raw = sqlProbe.execute(dataSource, dialect, sql, options);
            Evaluation evaluation = engine.evaluateAll(conditions, new SqlEvaluationContext(raw));
            return success(monitorId, evaluation, raw.ms(), redactor.redact(raw));
        } catch (SqlProbeException | UnsafeSqlException e) {
            return failure(monitorId, e.getMessage(), elapsedMs(start));
        }
    }

    private CheckResult success(String monitorId, Evaluation evaluation, long latencyMs, Object maskedPayload) {
        return new CheckResult(monitorId, evaluation.state(), latencyMs, maskedPayload,
                evaluation.results().stream().map(redactor::redact).toList(), null, clock.instant());
    }

    private CheckResult failure(String monitorId, String reason, long latencyMs) {
        String error = reason == null ? "Check failed" : redactor.redactText(reason);
        return new CheckResult(monitorId, MonitorState.DOWN, latencyMs, null, List.of(), error, clock.instant());
    }

    private static long elapsedMs(long startNanos) {
        return (System.nanoTime() - startNanos) / 1_000_000;
    }
}
