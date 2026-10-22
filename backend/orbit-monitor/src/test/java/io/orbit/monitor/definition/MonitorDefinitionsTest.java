package io.orbit.monitor.definition;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.monitor.condition.Severity;
import io.orbit.security.vault.SecretRef;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MonitorDefinitionsTest {

    @TempDir
    Path dir;
    private MonitorDefinitions definitions;

    @BeforeEach
    void setUp() {
        definitions = MonitorDefinitions.open(dir, ConfigMapper.create());
    }

    private static ConnectionDef connection() {
        return new ConnectionDef("con_core", "Core Oracle", "jdbc:oracle:thin:@db:1521/CORE", "orbit_ro",
                SecretRef.env("CORE_DB_PASSWORD"), 2, null, null);
    }

    private static SqlMonitorDef select(String connectionId) {
        return new SqlMonitorDef("sel_queue", "Reconciliation queue", "grp_payments", connectionId,
                "SELECT COUNT(*) AS PENDING_QTY FROM V_RECONCILIATION_PENDING", 60, 30_000, 500, 2, 0.10, false,
                List.of(new ConditionDef("[COL].PENDING_QTY < 200", Severity.DOWN)), List.of(), false, null, null);
    }

    private static HttpMonitorDef request() {
        return new HttpMonitorDef("req_portal", "Customer portal", "grp_portal", "GET", "https://portal.example.com/health",
                Map.of("Accept", "application/json"), Map.of("Authorization", SecretRef.env("PORTAL_TOKEN")), null,
                30, 5_000, true, 2, 0.10, false,
                List.of(new ConditionDef("[STATUS] == 200", Severity.DOWN),
                        new ConditionDef("[RESPONSE_TIME] < 800ms", Severity.WARN)), List.of(), false, null, null);
    }

    @Test
    void savesEachKindInItsOwnFile() {
        definitions.saveConnection(connection(), "Ana");
        definitions.saveSelect(select("con_core"), "Ana");
        definitions.saveRequest(request(), "Ana");

        assertThat(Files.exists(dir.resolve("orbit.connections.json"))).isTrue();
        assertThat(Files.exists(dir.resolve("orbit.selects.json"))).isTrue();
        assertThat(Files.exists(dir.resolve("orbit.requests.json"))).isTrue();
        assertThat(definitions.selects()).extracting(SqlMonitorDef::updatedBy).containsExactly("Ana");
        assertThat(definitions.requests()).extracting(HttpMonitorDef::id).containsExactly("req_portal");
    }

    @Test
    void secretsAreStoredAsReferencesNeverPlainText() throws Exception {
        definitions.saveConnection(connection(), "Ana");
        assertThat(Files.readString(dir.resolve("orbit.connections.json"))).contains("${env:CORE_DB_PASSWORD}");
    }

    @Test
    void selectMustReferenceAnExistingConnection() {
        assertThatThrownBy(() -> definitions.saveSelect(select("con_missing"), "Ana"))
                .isInstanceOfSatisfying(ConfigValidationException.class,
                        e -> assertThat(e.errors()).anyMatch(m -> m.contains("con_missing")));
    }

    @Test
    void unsafeSqlIsRejected() {
        definitions.saveConnection(connection(), "Ana");
        SqlMonitorDef bad = new SqlMonitorDef("sel_bad", "Bad", null, "con_core", "DELETE FROM t", 60, 30_000, 500, 1,
                0.1, false, List.of(), List.of(), false, null, null);
        assertThatThrownBy(() -> definitions.saveSelect(bad, "Ana")).isInstanceOf(ConfigValidationException.class);
    }

    @Test
    void invalidConditionIsRejectedWithItsMessage() {
        HttpMonitorDef bad = new HttpMonitorDef("req_bad", "Bad", null, "GET", "https://x.example.com", Map.of(),
                Map.of(), null, 30, 5_000, true, 1, 0.1, false,
                List.of(new ConditionDef("[NOPE] == 1", Severity.DOWN)), List.of(), false, null, null);
        assertThatThrownBy(() -> definitions.saveRequest(bad, "Ana"))
                .isInstanceOfSatisfying(ConfigValidationException.class,
                        e -> assertThat(e.errors()).anyMatch(m -> m.contains("Unknown placeholder")));
    }

    @Test
    void intervalMustBeBetween15SecondsAnd24Hours() {
        HttpMonitorDef fast = new HttpMonitorDef("req_fast", "Fast", null, "GET", "https://x.example.com", Map.of(),
                Map.of(), null, 5, 5_000, true, 1, 0.1, false, List.of(), List.of(), false, null, null);
        assertThatThrownBy(() -> definitions.saveRequest(fast, "Ana")).isInstanceOf(ConfigValidationException.class);
    }

    @Test
    void urlMustBeHttpOrHttps() {
        HttpMonitorDef ftp = new HttpMonitorDef("req_ftp", "Ftp", null, "GET", "ftp://x.example.com", Map.of(),
                Map.of(), null, 30, 5_000, true, 1, 0.1, false, List.of(), List.of(), false, null, null);
        assertThatThrownBy(() -> definitions.saveRequest(ftp, "Ana")).isInstanceOf(ConfigValidationException.class);
    }

    @Test
    void connectionInUseCannotBeDeleted() {
        definitions.saveConnection(connection(), "Ana");
        definitions.saveSelect(select("con_core"), "Ana");

        assertThatThrownBy(() -> definitions.deleteConnection("con_core")).isInstanceOf(IllegalStateException.class);
        assertThat(definitions.deleteSelect("sel_queue")).isTrue();
        assertThat(definitions.deleteConnection("con_core")).isTrue();
    }

    @Test
    void monitorIdsAreUniqueAcrossKinds() {
        definitions.saveConnection(connection(), "Ana");
        definitions.saveSelect(select("con_core"), "Ana");
        HttpMonitorDef clash = new HttpMonitorDef("sel_queue", "Clash", null, "GET", "https://x.example.com", Map.of(),
                Map.of(), null, 30, 5_000, true, 1, 0.1, false, List.of(), List.of(), false, null, null);
        assertThatThrownBy(() -> definitions.saveRequest(clash, "Ana")).isInstanceOf(ConfigValidationException.class);
    }

    @Test
    void cardFieldsCannotBeStoredAsSeries() {
        definitions.saveConnection(connection(), "Ana");
        SqlMonitorDef cards = new SqlMonitorDef("sel_cards", "Cards", null, "con_core", "SELECT card_number FROM v",
                60, 30_000, 500, 1, 0.1, false, List.of(),
                List.of(new FieldDef("CARD_NUMBER", "Card", "text", null, null, true, "table")), false, null, null);

        assertThatThrownBy(() -> definitions.saveSelect(cards, "Ana"))
                .isInstanceOfSatisfying(ConfigValidationException.class,
                        e -> assertThat(e.errors()).anyMatch(m -> m.contains("CARD_NUMBER")));
    }

    @Test
    void parsedConditionsAreAvailable() {
        assertThat(request().parsedConditions()).hasSize(2);
        assertThat(request().parsedConditions().get(1).severity()).isEqualTo(Severity.WARN);
    }

    @Test
    void exampleFilesLoadAndValidate() throws Exception {
        Path examples = Path.of("..", "config-examples");
        for (String feature : List.of("connections", "selects", "requests")) {
            Files.copy(examples.resolve("orbit." + feature + ".example.json"), dir.resolve("orbit." + feature + ".json"));
        }
        MonitorDefinitions loaded = MonitorDefinitions.open(dir, ConfigMapper.create());

        assertThat(loaded.connections()).hasSize(1);
        assertThat(loaded.selects()).hasSize(1);
        assertThat(loaded.requests()).hasSize(1);
        assertThat(loaded.requests().getFirst().secretHeaders().get("Authorization").envName())
                .isEqualTo("PORTAL_HEALTH_TOKEN");
    }

    @Test
    void findsAnyMonitorById() {
        definitions.saveConnection(connection(), "Ana");
        definitions.saveSelect(select("con_core"), "Ana");
        definitions.saveRequest(request(), "Ana");

        assertThat(definitions.monitor("sel_queue")).map(MonitorDef::kind).contains(MonitorKind.SQL);
        assertThat(definitions.monitor("req_portal")).map(MonitorDef::kind).contains(MonitorKind.HTTP);
        assertThat(definitions.monitors()).hasSize(2);
        assertThat(definitions.connection("con_core")).isPresent();
    }

    @Test
    void movesAMonitorToAnotherGroupKeepingEverythingElse() {
        definitions.saveConnection(connection(), "Ana");
        definitions.saveSelect(select("con_core"), "Ana");
        definitions.saveRequest(request(), "Ana");

        assertThat(definitions.moveToGroup("sel_queue", "grp_core", "Bia")).isTrue();
        assertThat(definitions.moveToGroup(request().id(), null, "Bia")).isTrue();
        assertThat(definitions.moveToGroup("missing", "grp_core", "Bia")).isFalse();

        MonitorDefinitions reloaded = MonitorDefinitions.open(dir, ConfigMapper.create());
        assertThat(reloaded.monitor("sel_queue")).hasValueSatisfying(m -> {
            assertThat(m.groupId()).isEqualTo("grp_core");
            assertThat(((SqlMonitorDef) m).sql()).isEqualTo(select("con_core").sql());
            assertThat(((SqlMonitorDef) m).updatedBy()).isEqualTo("Bia");
        });
        assertThat(reloaded.monitor(request().id())).hasValueSatisfying(m -> assertThat(m.groupId()).isNull());
    }

    @Test
    void requestUrlsMayReferenceWorkspaceVariables() {
        HttpMonitorDef r = request();
        HttpMonitorDef withVariables = new HttpMonitorDef(r.id(), r.name(), r.groupId(), r.method(),
                "https://${var:host}/stores/${var:store}?t=${vault:token}", r.headers(), r.secretHeaders(), r.body(),
                r.intervalSeconds(), r.timeoutMs(), r.followRedirects(), r.downAfter(), r.hysteresis(), r.openOnWarn(),
                r.conditions(), r.fields(), r.paused(), null, null);

        assertThat(definitions.saveRequest(withVariables, "Ana").url()).contains("${var:store}");
    }
}
