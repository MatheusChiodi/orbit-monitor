package io.orbit.api.runtime;

import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.monitor.sql.Dialect;
import io.orbit.probe.CheckPolicy;
import io.orbit.probe.CheckResult;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.resilience.CircuitBreaker;
import io.orbit.probe.resilience.TargetLimiter;
import io.orbit.probe.schedule.ProbeScheduler;
import io.orbit.probe.sql.SqlProbeOptions;
import io.orbit.security.vault.SecretResolver;
import io.orbit.security.vault.VaultException;
import io.orbit.telemetry.Heartbeat;
import io.orbit.telemetry.TelemetryService;

import java.net.URI;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Runs the configured monitors: keeps the scheduler in sync with the config files, executes one
 * check (probe, conditions, redaction), records the heartbeat and keeps the latest masked result.
 */
public class MonitorRuntime {

    private final MonitorDefinitions definitions;
    private final CheckRunner runner;
    private final TelemetryService telemetry;
    private final ConnectionPools pools;
    private final SecretResolver secrets;
    private final ProbeScheduler scheduler;
    private final EventBus bus;
    private final CircuitBreaker breaker;
    private final TargetLimiter limiter;
    private final Map<String, CheckResult> latest = new ConcurrentHashMap<>();

    public MonitorRuntime(MonitorDefinitions definitions, CheckRunner runner, TelemetryService telemetry,
                          ConnectionPools pools, SecretResolver secrets, ProbeScheduler scheduler, EventBus bus,
                          CircuitBreaker breaker, TargetLimiter limiter) {
        this.breaker = breaker;
        this.limiter = limiter;
        this.definitions = definitions;
        this.runner = runner;
        this.telemetry = telemetry;
        this.pools = pools;
        this.secrets = secrets;
        this.scheduler = scheduler;
        this.bus = bus;
    }

    /** Schedules active monitors, unschedules paused or removed ones and forgets removed data. */
    public synchronized void syncSchedule() {
        Map<String, MonitorDef> active = definitions.monitors().stream().filter(m -> !m.paused())
                .collect(Collectors.toMap(MonitorDef::id, m -> m));
        Set<String> known = definitions.monitors().stream().map(MonitorDef::id).collect(Collectors.toSet());
        for (String id : scheduler.scheduled()) {
            if (!active.containsKey(id)) {
                scheduler.unschedule(id);
            }
        }
        for (String id : Set.copyOf(latest.keySet())) {
            if (!known.contains(id)) {
                latest.remove(id);
                telemetry.forget(id);
            }
        }
        active.values().forEach(m -> scheduler.schedule(m.id(), m.interval()));
    }

    public Optional<CheckResult> runCheck(String monitorId) {
        Optional<MonitorDef> definition = definitions.monitor(monitorId);
        if (definition.isEmpty()) {
            return Optional.empty();
        }
        MonitorDef def = definition.get();
        CheckResult result = guarded(def);
        PrimaryValue primary = PrimaryValue.of(def, result);
        latest.put(monitorId, result);
        telemetry.record(new Heartbeat(monitorId, result.state(), result.latencyMs(), primary.value(),
                result.checkedAt()), def.downAfter());
        bus.publish(result);
        return Optional.of(result);
    }

    /**
     * BE-15/BE-16: one query at a time per target, and a target that failed three times in a row is
     * paused for a minute ("no response") instead of being hit again.
     */
    private CheckResult guarded(MonitorDef def) {
        String target = targetOf(def);
        if (!breaker.allow(target)) {
            return runner.failed(def.id(), "No response: target paused after repeated failures");
        }
        Optional<TargetLimiter.Permit> permit = limiter.tryAcquire(target, Duration.ofMillis(def.timeoutMs()));
        if (permit.isEmpty()) {
            return runner.failed(def.id(), "No response: another query is still running on this target");
        }
        try (TargetLimiter.Permit held = permit.get()) {
            CheckResult result = execute(def);
            if (result.error() == null) {
                breaker.recordSuccess(target);
            } else {
                breaker.recordFailure(target);
            }
            return result;
        }
    }

    private CheckResult execute(MonitorDef def) {
        CheckPolicy policy = new CheckPolicy(telemetry.currentState(def.id()), def.hysteresis());
        try {
            return switch (def) {
                case HttpMonitorDef http -> runner.runHttp(def.id(), request(http), http.parsedConditions(), policy);
                case SqlMonitorDef sql -> runSql(sql, policy);
                default -> runner.failed(def.id(), "Unsupported monitor type");
            };
        } catch (VaultException | IllegalArgumentException e) {
            return runner.failed(def.id(), e.getMessage());
        }
    }

    /** SQL monitors share their connection; HTTP monitors share their host. */
    private static String targetOf(MonitorDef def) {
        if (def instanceof SqlMonitorDef sql) {
            return "sql:" + sql.connectionId();
        }
        try {
            return "http:" + URI.create(((HttpMonitorDef) def).url()).getHost();
        } catch (IllegalArgumentException e) {
            return "http:" + def.id();
        }
    }

    public Optional<CheckResult> latest(String monitorId) {
        return Optional.ofNullable(latest.get(monitorId));
    }

    private CheckResult runSql(SqlMonitorDef sql, CheckPolicy policy) {
        Optional<ConnectionDef> connection = definitions.connection(sql.connectionId());
        if (connection.isEmpty()) {
            return runner.failed(sql.id(), "Unknown connection " + sql.connectionId());
        }
        ConnectionDef con = connection.get();
        SqlProbeOptions options = new SqlProbeOptions(sql.maxRows(), Duration.ofMillis(sql.timeoutMs()), 100);
        return runner.runSql(sql.id(), pools.dataSource(con), Dialect.fromJdbcUrl(con.jdbcUrl()), sql.sql(), options,
                sql.parsedConditions(), policy);
    }

    private HttpProbeRequest request(HttpMonitorDef http) {
        Map<String, String> headers = new HashMap<>(http.headers());
        http.secretHeaders().forEach((name, ref) -> headers.put(name, secrets.resolve(ref)));
        return new HttpProbeRequest(http.method(), URI.create(http.url()), headers, http.body(),
                Duration.ofMillis(http.timeoutMs()), http.followRedirects());
    }
}
