package io.orbit.monitor.definition;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.security.vault.SecretRef;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-12 query catalog")
class QueryCatalogTest {

    @TempDir
    Path dir;
    private QueryCatalog catalog;

    @BeforeEach
    void setUp() {
        MonitorDefinitions definitions = MonitorDefinitions.open(dir, ConfigMapper.create());
        definitions.saveConnection(new ConnectionDef("con_core", "Core", "jdbc:oracle:thin:@db:1521/CORE", "orbit_ro",
                SecretRef.env("CORE_DB_PASSWORD"), 2, null, null), "Ana");
        catalog = new QueryCatalog(new ConfigFile<>(dir, "query-catalog", QueryCatalog.SavedQuery.class,
                ConfigMapper.create(), items -> List.of()), definitions, Clock.systemUTC());
    }

    private static QueryCatalog.SavedQuery query(String id, String connectionId, String sql) {
        return new QueryCatalog.SavedQuery(id, "Pending reconciliation", connectionId, sql, "Payments team",
                "Rows waiting for reconciliation", null, null);
    }

    @Test
    @DisplayName("saves to orbit.query-catalog.json and lists by connection")
    void savesAndLists() {
        catalog.save(query("qry_pending", "con_core", "SELECT COUNT(*) AS PENDING_QTY FROM V_PENDING"), "Ana");

        assertThat(Files.exists(dir.resolve("orbit.query-catalog.json"))).isTrue();
        assertThat(catalog.byConnection("con_core")).extracting(QueryCatalog.SavedQuery::id).containsExactly("qry_pending");
        assertThat(catalog.find("qry_pending")).map(QueryCatalog.SavedQuery::updatedBy).contains("Ana");
        assertThat(catalog.byConnection("con_other")).isEmpty();
    }

    @Test
    @DisplayName("only safe SELECTs on existing connections are saved")
    void validates() {
        assertThatThrownBy(() -> catalog.save(query("qry_bad", "con_core", "DELETE FROM t"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> catalog.save(query("qry_orphan", "con_missing", "SELECT 1 FROM dual"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("deletes")
    void deletes() {
        catalog.save(query("qry_pending", "con_core", "SELECT 1 FROM dual"), "Ana");
        assertThat(catalog.delete("qry_pending")).isTrue();
        assertThat(catalog.delete("qry_pending")).isFalse();
    }
}
