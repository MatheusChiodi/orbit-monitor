package io.orbit.monitor.definition;

import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.monitor.condition.Severity;
import io.orbit.security.vault.SecretRef;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-04/05/07/08/09/10/11/17/18 extended monitor definitions in the config files")
class ExtendedDefinitionsTest {

    @TempDir
    Path dir;
    private MonitorDefinitions definitions;

    @BeforeEach
    void setUp() {
        definitions = MonitorDefinitions.open(dir, ConfigMapper.create());
    }

    private static CheckMonitorDef check(String id, CheckMonitorDef.Type type, String host, Integer port,
                                         CheckMonitorDef.Probe probe, WindowDef window, RetryDef retry) {
        return new CheckMonitorDef(id, "Check " + id, "grp_core", type, host, port, null, null, 60, 3_000, 1, 0.1,
                false, List.of(new ConditionDef("[RESPONSE_TIME] < 2s", Severity.WARN)), List.of(), false, null, null,
                probe, window, retry);
    }

    @Test
    @DisplayName("DNS, gRPC, Kafka and certificate checks round-trip through orbit.checks.json")
    void roundTrip() {
        definitions.saveCheck(check("dns_api", CheckMonitorDef.Type.DNS, "api.example.com", null,
                CheckMonitorDef.Probe.dns("A", "93.184.216.34"), null, null), "Ana");
        definitions.saveCheck(check("grpc_orders", CheckMonitorDef.Type.GRPC, "orders.internal", 9090,
                CheckMonitorDef.Probe.grpc("orders.v1.Orders", false), null, null), "Ana");
        definitions.saveCheck(check("kafka_lag", CheckMonitorDef.Type.KAFKA, null, null,
                CheckMonitorDef.Probe.kafka("broker1:9092,broker2:9092", "billing", "invoices"), null, null), "Ana");
        definitions.saveCheck(check("cert_portal", CheckMonitorDef.Type.CERT, "portal.example.com", 443,
                CheckMonitorDef.Probe.cert("example.com"), null, null), "Ana");

        MonitorDefinitions reread = MonitorDefinitions.open(dir, ConfigMapper.create());
        assertThat(reread.monitors()).extracting(MonitorDef::kind).containsExactlyInAnyOrder(
                MonitorKind.DNS, MonitorKind.GRPC, MonitorKind.KAFKA, MonitorKind.CERT);
        CheckMonitorDef kafka = (CheckMonitorDef) reread.monitor("kafka_lag").orElseThrow();
        assertThat(kafka.probe().topic()).isEqualTo("invoices");
        assertThat(kafka.probe().consumerGroup()).isEqualTo("billing");
        CheckMonitorDef dns = (CheckMonitorDef) reread.monitor("dns_api").orElseThrow();
        assertThat(dns.probe().recordType()).isEqualTo("A");
    }

    @Test
    @DisplayName("each new type validates its own settings")
    void validates() {
        assertThatThrownBy(() -> definitions.saveCheck(check("dns_bad", CheckMonitorDef.Type.DNS, "api.example.com",
                null, CheckMonitorDef.Probe.dns("SOA", null), null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("recordType");
        assertThatThrownBy(() -> definitions.saveCheck(check("grpc_bad", CheckMonitorDef.Type.GRPC, "orders", null,
                null, null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("port");
        assertThatThrownBy(() -> definitions.saveCheck(check("kafka_bad", CheckMonitorDef.Type.KAFKA, null, null,
                CheckMonitorDef.Probe.kafka("broker:9092", null, "t"), null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("consumerGroup");
        assertThatThrownBy(() -> definitions.saveCheck(check("cert_bad", CheckMonitorDef.Type.CERT, null, null,
                null, null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("host or probe.domain");
    }

    @Test
    @DisplayName("BE-17/BE-18: execution window and retry policy are validated")
    void windowAndRetry() {
        WindowDef window = new WindowDef(List.of("MONDAY", "FRIDAY"), "08:00", "18:00", "America/Sao_Paulo");
        RetryDef retry = new RetryDef(3, 500, 2.0, 5_000);
        definitions.saveCheck(check("tcp_ok", CheckMonitorDef.Type.TCP, "db", 1521, null, window, retry), "Ana");
        CheckMonitorDef saved = (CheckMonitorDef) MonitorDefinitions.open(dir, ConfigMapper.create())
                .monitor("tcp_ok").orElseThrow();
        assertThat(saved.window()).isEqualTo(window);
        assertThat(saved.retry()).isEqualTo(retry);

        assertThatThrownBy(() -> definitions.saveCheck(check("tcp_w", CheckMonitorDef.Type.TCP, "db", 1521, null,
                new WindowDef(List.of("FUNDAY"), "08:00", "25:00", "Mars/Base"), null), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("window");
        assertThatThrownBy(() -> definitions.saveCheck(check("tcp_r", CheckMonitorDef.Type.TCP, "db", 1521, null,
                null, new RetryDef(9, 100, 0.5, 100)), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("retry");
    }

    @Test
    @DisplayName("BE-07/BE-08: HTTP steps and OAuth2 client credentials; the client secret is a vault reference")
    void httpStepsAndOAuth() {
        HttpMonitorDef.Step login = new HttpMonitorDef.Step("login", "POST", "https://api.example.com/login",
                Map.of("Content-Type", "application/json"), "{\"user\":\"probe\"}", Map.of("token", "$.token"));
        HttpMonitorDef.OAuth oauth = new HttpMonitorDef.OAuth("https://auth.example.com/token", "orbit",
                SecretRef.env("ORBIT_CLIENT_SECRET"), "read");
        HttpMonitorDef http = new HttpMonitorDef("req_api", "API", "grp_core", "GET",
                "https://api.example.com/orders", Map.of("X-Token", "${login.token}"), Map.of(), null, 60, 5_000, true,
                1, 0.1, false, List.of(), List.of(), false, null, null, List.of(login), oauth, null, null);
        definitions.saveRequest(http, "Ana");

        HttpMonitorDef saved = MonitorDefinitions.open(dir, ConfigMapper.create()).requests().getFirst();
        assertThat(saved.steps()).containsExactly(login);
        assertThat(saved.oauth().clientSecret()).isEqualTo(SecretRef.env("ORBIT_CLIENT_SECRET"));

        HttpMonitorDef badStep = new HttpMonitorDef("req_bad", "API", "grp_core", "GET", "https://api.example.com/x",
                Map.of(), Map.of(), null, 60, 5_000, true, 1, 0.1, false, List.of(), List.of(), false, null, null,
                List.of(new HttpMonitorDef.Step("bad name!", "GET", "ftp://x", null, null, null)), null, null, null);
        assertThatThrownBy(() -> definitions.saveRequest(badStep, "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("step");
        HttpMonitorDef badOauth = new HttpMonitorDef("req_oauth", "API", "grp_core", "GET", "https://api.example.com/x",
                Map.of(), Map.of(), null, 60, 5_000, true, 1, 0.1, false, List.of(), List.of(), false, null, null,
                List.of(), new HttpMonitorDef.OAuth("https://auth.example.com/token", "orbit", null, null), null, null);
        assertThatThrownBy(() -> definitions.saveRequest(badOauth, "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("oauth.clientSecret");
    }

    @Test
    @DisplayName("BE-11: SELECT parameters are stored and every :name needs a value")
    void sqlParameters() {
        definitions.saveConnection(new ConnectionDef("con_core", "Core", "jdbc:h2:mem:x", "sa", null, 2, null, null),
                "Ana");
        SqlMonitorDef sql = new SqlMonitorDef("sel_p", "Param", "grp", "con_core",
                "SELECT COUNT(*) AS N FROM T WHERE STATUS = :status", 60, 30_000, 500, 1, 0.1, false, List.of(),
                List.of(), false, null, null, Map.of("status", "PENDING"), null, null);
        definitions.saveSelect(sql, "Ana");
        assertThat(MonitorDefinitions.open(dir, ConfigMapper.create()).selects().getFirst().parameters())
                .containsEntry("status", "PENDING");

        SqlMonitorDef missing = new SqlMonitorDef("sel_m", "Param", "grp", "con_core",
                "SELECT COUNT(*) AS N FROM T WHERE STATUS = :status", 60, 30_000, 500, 1, 0.1, false, List.of(),
                List.of(), false, null, null, Map.of(), null, null);
        assertThatThrownBy(() -> definitions.saveSelect(missing, "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("status");
        assertThat(Files.exists(dir.resolve("orbit.selects.json"))).isTrue();
    }

    @Test
    @DisplayName("BE-52: ids that are fixed history sub-paths are reserved")
    void reservedIds() {
        for (String id : List.of("coverage", "health", "audit")) {
            assertThatThrownBy(() -> definitions.saveCheck(check(id, CheckMonitorDef.Type.TCP, "db", 1521, null, null,
                    null), "Ana")).isInstanceOf(ConfigValidationException.class).hasMessageContaining("reserved");
        }
    }
}
