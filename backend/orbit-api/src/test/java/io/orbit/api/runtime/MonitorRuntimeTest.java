package io.orbit.api.runtime;

import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.config.ConfigMapper;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.definition.ConditionDef;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.LimitWrapper;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.SelectValidator;
import io.orbit.probe.CheckResult;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.http.HostResolver;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.SsrfGuard;
import io.orbit.probe.schedule.ProbeScheduler;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.security.vault.MasterKey;
import io.orbit.security.vault.SecretCipher;
import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;
import io.orbit.telemetry.HeartbeatStore;
import io.orbit.telemetry.StateTracker;
import io.orbit.telemetry.TelemetryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.LinkedBlockingQueue;

import static org.assertj.core.api.Assertions.assertThat;

class MonitorRuntimeTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    @TempDir
    Path dir;
    private MonitorDefinitions definitions;
    private TelemetryService telemetry;
    private ConnectionPools pools;
    private ProbeScheduler scheduler;
    private MonitorRuntime runtime;
    private final List<CheckResult> published = new ArrayList<>();
    private String h2Url;

    @BeforeEach
    void setUp() throws Exception {
        h2Url = "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        try (Connection c = DriverManager.getConnection(h2Url, "sa", "pw"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE queue (pending_qty INT, card_number VARCHAR(19))");
            st.execute("INSERT INTO queue VALUES (347, '" + TEST_PAN + "')");
        }
        Clock clock = Clock.systemUTC();
        SecretResolver secrets = new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(dir.resolve("master.key"))),
                Map.of("H2_PASSWORD", "pw")::get);
        definitions = MonitorDefinitions.open(dir.resolve("config"), ConfigMapper.create());
        telemetry = new TelemetryService(new HeartbeatStore(Duration.ofHours(24), 1_000), new StateTracker(), e -> { });
        pools = new ConnectionPools(secrets);
        scheduler = new ProbeScheduler(clock, new LinkedBlockingQueue<>());
        CheckRunner runner = new CheckRunner(new HttpProbe(new SsrfGuard(HostResolver.system(), Set.of())),
                new SqlProbe(new SelectValidator(), new LimitWrapper()), new ConditionEngine(clock),
                new PayloadRedactor(new SensitiveDataRedactor()), clock);
        EventBus bus = new EventBus();
        bus.onCheck(published::add);
        runtime = new MonitorRuntime(definitions, runner, telemetry, pools, secrets, scheduler, bus);
        definitions.saveConnection(new ConnectionDef("con_h2", "H2", h2Url, "sa", SecretRef.env("H2_PASSWORD"), 1,
                null, null), "Ana");
    }

    @AfterEach
    void tearDown() {
        pools.close();
    }

    private SqlMonitorDef select(String id, String sql, boolean paused) {
        return new SqlMonitorDef(id, "Queue", "grp", "con_h2", sql, 60, 5_000, 100, 1, 0.1, false,
                List.of(new ConditionDef("[COL].PENDING_QTY < 200", Severity.WARN)), List.of(), paused, null, null);
    }

    @Test
    void sqlCheckRecordsStateValueAndMaskedResult() {
        definitions.saveSelect(select("sel_queue", "SELECT pending_qty, card_number FROM queue", false), "Ana");

        CheckResult result = runtime.runCheck("sel_queue").orElseThrow();

        assertThat(result.state()).isEqualTo(MonitorState.WARN);
        assertThat(((ResultPayload) result.payload()).rows().getFirst()).containsExactly(347, "•••• •••• •••• 1111");
        assertThat(telemetry.currentState("sel_queue")).isEqualTo(MonitorState.WARN);
        assertThat(telemetry.status("sel_queue").history().getFirst().value()).isEqualTo(347.0);
        assertThat(runtime.latest("sel_queue")).contains(result);
        assertThat(published).containsExactly(result);
    }

    @Test
    void missingSecretMakesTheCheckDownInsteadOfThrowing() {
        definitions.saveConnection(new ConnectionDef("con_nokey", "No key", h2Url, "sa", SecretRef.env("MISSING"), 1,
                null, null), "Ana");
        definitions.saveSelect(new SqlMonitorDef("sel_nokey", "No key", null, "con_nokey", "SELECT 1", 60, 5_000, 10, 1,
                0.1, false, List.of(), List.of(), false, null, null), "Ana");

        CheckResult result = runtime.runCheck("sel_nokey").orElseThrow();

        assertThat(result.state()).isEqualTo(MonitorState.DOWN);
        assertThat(result.error()).contains("MISSING");
    }

    @Test
    void blockedHttpTargetIsDown() {
        definitions.saveRequest(new HttpMonitorDef("req_local", "Local", null, "GET", "http://127.0.0.1:9/health",
                Map.of(), Map.of(), null, 30, 1_000, true, 1, 0.1, false, List.of(), List.of(), false, null, null), "Ana");

        CheckResult result = runtime.runCheck("req_local").orElseThrow();

        assertThat(result.state()).isEqualTo(MonitorState.DOWN);
        assertThat(result.error()).contains("blocked");
    }

    @Test
    void unknownMonitorIsIgnored() {
        assertThat(runtime.runCheck("nope")).isEmpty();
    }

    @Test
    void syncSchedulesActiveMonitorsOnly() {
        definitions.saveSelect(select("sel_a", "SELECT pending_qty FROM queue", false), "Ana");
        definitions.saveSelect(select("sel_paused", "SELECT pending_qty FROM queue", true), "Ana");

        runtime.syncSchedule();
        assertThat(scheduler.scheduled()).containsExactly("sel_a");

        definitions.deleteSelect("sel_a");
        runtime.syncSchedule();
        assertThat(scheduler.scheduled()).isEmpty();
    }

    @Test
    void forgettingAMonitorDropsItsData() {
        definitions.saveSelect(select("sel_a", "SELECT pending_qty FROM queue", false), "Ana");
        runtime.runCheck("sel_a");
        definitions.deleteSelect("sel_a");

        runtime.syncSchedule();

        assertThat(runtime.latest("sel_a")).isEmpty();
        assertThat(telemetry.status("sel_a").history()).isEmpty();
    }
}
