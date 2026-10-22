package io.orbit.api.runtime;

import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.config.ConfigMapper;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.definition.CheckMonitorDef;
import io.orbit.monitor.definition.ConditionDef;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.FieldDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.RetryDef;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.monitor.definition.WindowDef;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.LimitWrapper;
import io.orbit.monitor.sql.SelectValidator;
import io.orbit.probe.CheckResult;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.http.HostResolver;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.SsrfGuard;
import io.orbit.probe.ping.PingProbe;
import io.orbit.probe.push.PushRegistry;
import io.orbit.probe.resilience.CircuitBreaker;
import io.orbit.probe.resilience.TargetLimiter;
import io.orbit.probe.schedule.ProbeScheduler;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.probe.tcp.TcpProbe;
import io.orbit.security.vault.MasterKey;
import io.orbit.security.vault.SecretCipher;
import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;
import io.orbit.telemetry.HeartbeatStore;
import io.orbit.telemetry.StateTracker;
import io.orbit.telemetry.TelemetryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MonitorRuntime: execution windows (BE-17), retries (BE-18), SQL parameters (BE-11) and series")
class MonitorRuntimeExtendedTest {

    private static final AtomicInteger DATABASES = new AtomicInteger();
    /** Wednesday 2026-10-21 23:00 UTC = 20:00 in Sao Paulo. */
    private static final Instant WEDNESDAY_EVENING = Instant.parse("2026-10-21T23:00:00Z");
    private static final String TEST_PAN = "4111111111111111";

    @TempDir
    Path dir;
    private MonitorDefinitions definitions;
    private ConnectionPools pools;
    private final List<Duration> sleeps = new ArrayList<>();
    private String h2Url;

    @BeforeEach
    void setUp() throws Exception {
        h2Url = "jdbc:h2:mem:runtime_ext_" + DATABASES.incrementAndGet() + ";DB_CLOSE_DELAY=-1";
        try (Connection c = DriverManager.getConnection(h2Url, "sa", "pw"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE jobs (status VARCHAR(10), qty INT, card_number VARCHAR(19))");
            st.execute("INSERT INTO jobs VALUES ('PENDING', 7, '" + TEST_PAN + "'), ('DONE', 3, NULL)");
        }
        definitions = MonitorDefinitions.open(dir.resolve("config"), ConfigMapper.create());
        definitions.saveConnection(new ConnectionDef("con_h2", "H2", h2Url, "sa", SecretRef.env("H2_PASSWORD"), 1,
                null, null), "Ana");
    }

    @AfterEach
    void tearDown() {
        if (pools != null) {
            pools.close();
        }
    }

    private MonitorRuntime runtime(Clock clock) {
        SecretResolver secrets = new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(dir.resolve("master.key"))),
                Map.of("H2_PASSWORD", "pw")::get);
        pools = new ConnectionPools(secrets);
        CheckRunner runner = new CheckRunner(new HttpProbe(new SsrfGuard(HostResolver.system(), Set.of())),
                new SqlProbe(new SelectValidator(), new LimitWrapper()), new ConditionEngine(clock),
                new PayloadRedactor(new SensitiveDataRedactor()), clock);
        TelemetryService telemetry = new TelemetryService(new HeartbeatStore(Duration.ofHours(24), 1_000),
                new StateTracker(), e -> { });
        return new MonitorRuntime(definitions, runner, telemetry, pools, secrets,
                new ProbeScheduler(clock, new LinkedBlockingQueue<>()), new EventBus(),
                new CircuitBreaker(clock, 10, Duration.ofMinutes(1)), new TargetLimiter(1),
                new SimpleProbes(new TcpProbe(), new PingProbe((h, t) -> -1, new TcpProbe(), 443),
                        new PushRegistry(clock), new SsrfGuard(HostResolver.system(), Set.of())),
                null, sleeps::add, clock);
    }

    private CheckMonitorDef closedPort(String id, WindowDef window, RetryDef retry) {
        return new CheckMonitorDef(id, "Closed port", "grp", CheckMonitorDef.Type.TCP, "127.0.0.1", 1, null, null, 60,
                1_000, 1, 0.1, false, List.of(), List.of(), false, null, null, null, window, retry);
    }

    @Test
    @DisplayName("BE-17: a scheduled run outside the window is skipped; Test now still runs")
    void window() {
        MonitorRuntime runtime = runtime(Clock.fixed(WEDNESDAY_EVENING, ZoneOffset.UTC));
        definitions.saveCheck(closedPort("tcp_biz", new WindowDef(List.of("WEDNESDAY"), "08:00", "18:00",
                "America/Sao_Paulo"), null), "Ana");
        definitions.saveCheck(closedPort("tcp_night", new WindowDef(List.of("WEDNESDAY"), "19:00", "21:00",
                "America/Sao_Paulo"), null), "Ana");

        assertThat(runtime.runScheduled("tcp_biz")).isEmpty();
        assertThat(runtime.latest("tcp_biz")).isEmpty();
        assertThat(runtime.runCheck("tcp_biz")).map(CheckResult::state).contains(MonitorState.DOWN);
        assertThat(runtime.runScheduled("tcp_night")).isPresent();
    }

    @Test
    @DisplayName("BE-18: a DOWN check is retried with exponential backoff before it is reported")
    void retry() {
        MonitorRuntime runtime = runtime(Clock.systemUTC());
        definitions.saveCheck(closedPort("tcp_retry", null, new RetryDef(3, 200, 2.0, 1_000)), "Ana");

        CheckResult result = runtime.runCheck("tcp_retry").orElseThrow();

        assertThat(result.state()).isEqualTo(MonitorState.DOWN);
        assertThat(sleeps).containsExactly(Duration.ofMillis(200), Duration.ofMillis(400));
    }

    @Test
    @DisplayName("BE-11 + series: :status is bound; series fields become metrics but a card column never does")
    void sqlParametersAndSeries() {
        MonitorRuntime runtime = runtime(Clock.systemUTC());
        definitions.saveSelect(new SqlMonitorDef("sel_jobs", "Jobs", "grp", "con_h2",
                "SELECT qty, card_number FROM jobs WHERE status = :status", 60, 5_000, 10, 1, 0.1, false,
                List.of(new ConditionDef("[COL].QTY < 5", Severity.WARN)),
                List.of(new FieldDef("QTY", "Qty", "integer", null, null, true, "number"),
                        new FieldDef("CARD_NUMBER", "Card", "text", null, null, false, "text")),
                false, null, null, Map.of("status", "PENDING"), null, null), "Ana");

        CheckResult result = runtime.runCheck("sel_jobs").orElseThrow();

        assertThat(result.error()).isNull();
        assertThat(result.state()).isEqualTo(MonitorState.WARN);
        assertThat(result.metrics()).containsExactly(Map.entry("QTY", 7.0));
    }

    @Test
    @DisplayName("extended check types without adapters fail with a reason instead of throwing")
    void unavailable() {
        MonitorRuntime runtime = runtime(Clock.systemUTC());
        definitions.saveCheck(new CheckMonitorDef("dns_x", "DNS", "grp", CheckMonitorDef.Type.DNS, "example.com",
                null, null, null, 60, 1_000, 1, 0.1, false, List.of(), List.of(), false, null, null,
                CheckMonitorDef.Probe.dns("A", null), null, null), "Ana");

        CheckResult result = runtime.runCheck("dns_x").orElseThrow();

        assertThat(result.state()).isEqualTo(MonitorState.DOWN);
        assertThat(result.error()).contains("not available");
    }
}
