package io.orbit.api.runtime;

import io.orbit.common.MonitorState;
import io.orbit.monitor.definition.CheckMonitorDef;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.RetryDef;
import io.orbit.monitor.definition.WindowDef;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.monitor.sql.Dialect;
import io.orbit.probe.CheckPolicy;
import io.orbit.probe.CheckResult;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.multistep.MultiStepHttpProbe;
import io.orbit.probe.ping.PingProbe;
import io.orbit.probe.resilience.ExecutionWindow;
import io.orbit.probe.resilience.RetryPolicy;
import io.orbit.probe.tcp.TcpProbe;
import io.orbit.probe.resilience.CircuitBreaker;
import io.orbit.probe.resilience.TargetLimiter;
import io.orbit.probe.schedule.ProbeScheduler;
import io.orbit.probe.sql.SqlProbeOptions;
import io.orbit.security.vault.SecretResolver;
import io.orbit.security.vault.VaultException;
import io.orbit.telemetry.Heartbeat;
import io.orbit.telemetry.TelemetryService;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
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
    private final SimpleProbes probes;
    private final ExtendedChecks extended;
    private final RetryPolicy.Sleeper sleeper;
    private final Clock clock;
    private final Map<String, CheckResult> latest = new ConcurrentHashMap<>();

    public MonitorRuntime(MonitorDefinitions definitions, CheckRunner runner, TelemetryService telemetry,
                          ConnectionPools pools, SecretResolver secrets, ProbeScheduler scheduler, EventBus bus,
                          CircuitBreaker breaker, TargetLimiter limiter, SimpleProbes probes) {
        this(definitions, runner, telemetry, pools, secrets, scheduler, bus, breaker, limiter, probes, null,
                duration -> Thread.sleep(duration.toMillis()), Clock.systemUTC());
    }

    /**
     * @param extended DNS, certificate, gRPC, Kafka, multi-step and OAuth2 support; null disables them
     * @param sleeper  waits between retry attempts (BE-18)
     * @param clock    decides whether an execution window is open (BE-17)
     */
    public MonitorRuntime(MonitorDefinitions definitions, CheckRunner runner, TelemetryService telemetry,
                          ConnectionPools pools, SecretResolver secrets, ProbeScheduler scheduler, EventBus bus,
                          CircuitBreaker breaker, TargetLimiter limiter, SimpleProbes probes, ExtendedChecks extended,
                          RetryPolicy.Sleeper sleeper, Clock clock) {
        this.extended = extended;
        this.sleeper = sleeper;
        this.clock = clock;
        this.probes = probes;
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
        syncPushTokens();
        if (extended != null) {
            extended.retainKafka(definitions.checks().stream().filter(c -> c.type() == CheckMonitorDef.Type.KAFKA)
                    .map(c -> c.probe().bootstrapServers()).collect(Collectors.toSet()));
        }
    }

    /**
     * Scheduled run (workers): skipped while the monitor's execution window is closed (BE-17), so
     * the last state and the history stay as they were. "Test now" uses {@link #runCheck} and always runs.
     */
    public Optional<CheckResult> runScheduled(String monitorId) {
        Optional<MonitorDef> definition = definitions.monitor(monitorId);
        if (definition.isEmpty() || !windowOpen(definition.get())) {
            return Optional.empty();
        }
        return runCheck(monitorId);
    }

    /** BE-17: true when the monitor has no window or the window is open now. */
    public boolean windowOpen(MonitorDef def) {
        WindowDef w = def.window();
        if (w == null || !w.problems().isEmpty()) {
            return true;
        }
        return new ExecutionWindow(Set.copyOf(w.dayOfWeeks()), w.fromTime(), w.toTime(), w.zoneId())
                .isOpen(clock.instant());
    }

    /** BE-03: the registry holds the tokens of configured push monitors, decrypted from the vault. */
    private void syncPushTokens() {
        for (CheckMonitorDef check : definitions.checks()) {
            if (check.type() != CheckMonitorDef.Type.PUSH || check.pushToken() == null) {
                probes.push().forget(check.id());
                continue;
            }
            try {
                int silence = check.maxSilenceSeconds() == null ? 0 : check.maxSilenceSeconds();
                probes.push().restore(check.id(), secrets.resolve(check.pushToken()), Duration.ofSeconds(silence));
            } catch (VaultException e) {
                probes.push().forget(check.id());
            }
        }
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
            CheckResult result = withRetry(def);
            if (result.error() == null) {
                breaker.recordSuccess(target);
            } else {
                breaker.recordFailure(target);
            }
            return result;
        }
    }

    /** BE-18: a DOWN result is retried with exponential backoff before it is reported. */
    private CheckResult withRetry(MonitorDef def) {
        RetryDef retry = def.retry();
        if (retry == null || retry.attempts() <= 1 || !retry.problems().isEmpty()) {
            return execute(def);
        }
        RetryPolicy policy = new RetryPolicy(retry.attempts(), Duration.ofMillis(retry.initialDelay()), retry.growth(),
                Duration.ofMillis(retry.maxDelay()));
        return policy.run(() -> execute(def), r -> r.state() != MonitorState.DOWN, sleeper);
    }

    private CheckResult execute(MonitorDef def) {
        CheckPolicy policy = new CheckPolicy(telemetry.currentState(def.id()), def.hysteresis());
        try {
            CheckResult result = switch (def) {
                case HttpMonitorDef http -> runHttp(http, policy);
                case SqlMonitorDef sql -> runSql(sql, policy);
                case CheckMonitorDef check -> runCheckMonitor(check, policy);
                default -> runner.failed(def.id(), "Unsupported monitor type");
            };
            return SeriesMetrics.keep(def, result);
        } catch (VaultException | IllegalArgumentException | IllegalStateException | SsrfBlockedException e) {
            return runner.failed(def.id(), e.getMessage());
        }
    }

    /** HTTP monitor: single request or BE-07 steps, BE-08 OAuth2 token, BE-23 metric paths. */
    private CheckResult runHttp(HttpMonitorDef http, CheckPolicy policy) {
        Map<String, String> headers = headers(http);
        List<String> metricPaths = SeriesMetrics.jsonPaths(http);
        CheckResult result;
        if (http.steps().isEmpty()) {
            result = runner.runHttp(http.id(), request(http, headers), http.parsedConditions(), policy, metricPaths);
        } else {
            requireExtended();
            List<MultiStepHttpProbe.Step> steps = new ArrayList<>();
            http.steps().forEach(s -> steps.add(new MultiStepHttpProbe.Step(s.name(), s.method(), s.url(), s.headers(),
                    s.body(), s.extract())));
            steps.add(new MultiStepHttpProbe.Step("main", http.method(), http.url(), headers, http.body(), Map.of()));
            result = runner.runSteps(http.id(), extended.multiStep(Duration.ofMillis(http.timeoutMs())), steps,
                    http.parsedConditions(), policy, metricPaths);
        }
        if (http.oauth() != null && result.payload() instanceof HttpResponseSnapshot response
                && response.status() == 401) {
            extended.rejected(http);
        }
        return result;
    }

    private void requireExtended() {
        if (extended == null) {
            throw new IllegalStateException("This check type is not available in this runtime");
        }
    }

    /** BE-01/02/03: TCP connect, ping (ICMP or TCP fallback) and push silence. */
    private CheckResult runCheckMonitor(CheckMonitorDef check, CheckPolicy policy) {
        Duration timeout = Duration.ofMillis(check.timeoutMs());
        CheckRunner.Reachability outcome = switch (check.type()) {
            case TCP -> {
                probes.guard().check(URI.create("http://" + check.host()));
                TcpProbe.TcpResult r = probes.tcp().check(check.host(), check.port(), timeout);
                yield new CheckRunner.Reachability(r.open(), r.connectMs(),
                        r.open() ? null : "Connection " + r.failure().name().toLowerCase(Locale.ROOT));
            }
            case PING -> {
                probes.guard().check(URI.create("http://" + check.host()));
                PingProbe.PingResult r = probes.ping().check(check.host(), timeout);
                yield new CheckRunner.Reachability(r.reachable(), r.ms(), r.reachable() ? null : "Host unreachable");
            }
            case DNS, GRPC, KAFKA, CERT -> {
                requireExtended();
                yield null;
            }
            case PUSH -> {
                MonitorState state = probes.push().state(check.id());
                if (state == MonitorState.UNKNOWN) {
                    yield null;
                }
                yield new CheckRunner.Reachability(state == MonitorState.OK, 0, state == MonitorState.OK ? null
                        : "No signal for more than " + check.maxSilenceSeconds() / 60 + " min");
            }
        };
        if (outcome == null && check.type() != CheckMonitorDef.Type.PUSH) {
            return extended.run(check, policy);
        }
        return outcome == null ? runner.unknown(check.id())
                : runner.runReachability(check.id(), outcome, check.parsedConditions(), policy);
    }

    /** SQL monitors share their connection; HTTP monitors share their host. */
    private static String targetOf(MonitorDef def) {
        if (def instanceof SqlMonitorDef sql) {
            return "sql:" + sql.connectionId();
        }
        if (def instanceof CheckMonitorDef check) {
            return switch (check.type()) {
                case PUSH -> "push:" + check.id();
                case KAFKA -> "kafka:" + check.probe().bootstrapServers();
                case CERT -> "cert:" + (check.host() == null ? check.probe().domain() : check.host());
                default -> check.type().name().toLowerCase(Locale.ROOT) + ":" + check.host();
            };
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
        return runner.runSql(sql.id(), pools.dataSource(con), Dialect.fromJdbcUrl(con.jdbcUrl()), sql.sql(),
                sql.parameters(), options, sql.parsedConditions(), policy);
    }

    /** Plain headers, vault secrets and the OAuth2 bearer token (which wins over a typed Authorization). */
    private Map<String, String> headers(HttpMonitorDef http) {
        Map<String, String> headers = new HashMap<>(http.headers());
        http.secretHeaders().forEach((name, ref) -> headers.put(name, secrets.resolve(ref)));
        if (http.oauth() != null) {
            requireExtended();
            headers.keySet().removeIf(name -> name.equalsIgnoreCase("Authorization"));
            extended.authorization(http).ifPresent(token -> headers.put("Authorization", token));
        }
        return headers;
    }

    private static HttpProbeRequest request(HttpMonitorDef http, Map<String, String> headers) {
        return new HttpProbeRequest(http.method(), URI.create(http.url()), headers, http.body(),
                Duration.ofMillis(http.timeoutMs()), http.followRedirects());
    }
}
