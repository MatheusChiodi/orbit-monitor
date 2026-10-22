package io.orbit.api.runtime;

import com.sun.net.httpserver.HttpServer;
import io.orbit.common.MonitorState;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.config.ConfigFile;
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
import io.orbit.workspace.variable.VariableService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-39 workspace variables resolved at run time")
class MonitorRuntimeVariablesTest {

    @TempDir
    Path dir;
    private MonitorDefinitions definitions;
    private ConnectionPools pools;
    private MonitorRuntime runtime;
    private VariableService variables;
    private HttpServer server;
    private final AtomicReference<String> seen = new AtomicReference<>();

    @BeforeEach
    void setUp() throws Exception {
        String h2Url = "jdbc:h2:mem:variables_" + System.nanoTime() % 100_000 + ";DB_CLOSE_DELAY=-1";
        try (Connection c = DriverManager.getConnection(h2Url, "sa", "pw"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE orders (store VARCHAR(8), qty INT)");
            st.execute("INSERT INTO orders VALUES ('SP01', 7), ('RJ02', 3)");
        }
        Clock clock = Clock.systemUTC();
        SecretResolver secrets = new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(dir.resolve("master.key"))),
                Map.of("H2_PASSWORD", "pw", "ORBIT_REGION", "south")::get);
        definitions = MonitorDefinitions.open(dir.resolve("config"), ConfigMapper.create());
        variables = new VariableService(new ConfigFile<>(dir.resolve("config"), "variables",
                VariableService.Variable.class, ConfigMapper.create(), VariableService.VALIDATOR), secrets, clock,
                Map.of("ORBIT_REGION", "south")::get);
        pools = new ConnectionPools(secrets);
        CheckRunner runner = new CheckRunner(new HttpProbe(new SsrfGuard(HostResolver.system(), Set.of())),
                new SqlProbe(new SelectValidator(), new LimitWrapper()), new ConditionEngine(clock),
                new PayloadRedactor(new SensitiveDataRedactor()), clock);
        runtime = new MonitorRuntime(definitions, runner, new TelemetryService(new HeartbeatStore(Duration.ofHours(1),
                100), new StateTracker(), e -> { }), pools, secrets, new ProbeScheduler(clock, new LinkedBlockingQueue<>()),
                new EventBus(), new CircuitBreaker(clock, 3, Duration.ofMinutes(1)), new TargetLimiter(1),
                new SimpleProbes(new TcpProbe(), new PingProbe((h, t) -> -1, new TcpProbe(), 443),
                        new PushRegistry(clock), new SsrfGuard(HostResolver.system(), Set.of())), variables::resolver);
        definitions.saveConnection(new ConnectionDef("con_h2", "H2", h2Url, "sa", SecretRef.env("H2_PASSWORD"), 1,
                null, null), "Ana");

        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            seen.set(exchange.getRequestURI() + "|" + exchange.getRequestHeaders().getFirst("X-Token") + "|" + body);
            byte[] ok = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, ok.length);
            exchange.getResponseBody().write(ok);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void tearDown() {
        pools.close();
        server.stop(0);
    }

    @Test
    @DisplayName("URL, headers and body of an HTTP monitor use ${var:..}, ${vault:..} and ${env:..}")
    void http() {
        variables.save(new VariableService.Input("var_store", "store", VariableService.Kind.VAR, "SP01", null), "Ana");
        variables.save(new VariableService.Input("var_token", "token", VariableService.Kind.VAULT, "tok-123", null), "Ana");
        String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/stores/${var:store}";
        definitions.saveRequest(new HttpMonitorDef("req_vars", "Vars", null, "POST", url,
                Map.of("X-Token", "${vault:token}"), Map.of(), "{\"region\":\"${env:ORBIT_REGION}\"}", 30, 5_000, false,
                1, 0.1, false, List.of(), List.of(), false, null, null), "Ana");

        CheckResult result = runtime.runCheck("req_vars").orElseThrow();

        assertThat(result.error()).isNull();
        assertThat(seen.get()).isEqualTo("/stores/SP01|tok-123|{\"region\":\"south\"}");
    }

    @Test
    @DisplayName("SQL parameters use workspace variables and are bound, never concatenated")
    void sqlParameters() {
        variables.save(new VariableService.Input("var_store", "store", VariableService.Kind.VAR, "RJ02", null), "Ana");
        definitions.saveSelect(new SqlMonitorDef("sel_store", "Store", null, "con_h2",
                "SELECT qty FROM orders WHERE store = :store", 60, 5_000, 10, 1, 0.1, false,
                List.of(new ConditionDef("[COL].QTY > 5", Severity.WARN)), List.of(), false, null, null,
                Map.of("store", "${var:store}")), "Ana");

        CheckResult result = runtime.runCheck("sel_store").orElseThrow();

        assertThat(result.error()).isNull();
        assertThat(result.state()).isEqualTo(MonitorState.WARN);
    }

    @Test
    @DisplayName("an unknown variable fails the check with its name")
    void unknownVariable() {
        definitions.saveSelect(new SqlMonitorDef("sel_missing", "Missing", null, "con_h2",
                "SELECT qty FROM orders WHERE store = :store", 60, 5_000, 10, 1, 0.1, false, List.of(), List.of(),
                false, null, null, Map.of("store", "${var:nope}")), "Ana");

        CheckResult result = runtime.runCheck("sel_missing").orElseThrow();

        assertThat(result.state()).isEqualTo(MonitorState.DOWN);
        assertThat(result.error()).contains("nope");
    }
}
