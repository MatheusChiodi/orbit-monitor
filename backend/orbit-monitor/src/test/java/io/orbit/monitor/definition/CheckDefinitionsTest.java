package io.orbit.monitor.definition;

import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.monitor.condition.Severity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-01/BE-02/BE-03 TCP, ping and push checks in orbit.checks.json")
class CheckDefinitionsTest {

    @TempDir
    Path dir;
    private MonitorDefinitions definitions;

    @BeforeEach
    void setUp() {
        definitions = MonitorDefinitions.open(dir, ConfigMapper.create());
    }

    private static CheckMonitorDef check(String id, CheckMonitorDef.Type type, String host, Integer port,
                                         Integer maxSilenceSeconds) {
        return new CheckMonitorDef(id, "Check " + id, "grp_core", type, host, port, null, maxSilenceSeconds, 60, 3_000,
                1, 0.1, false, List.of(new ConditionDef("[RESPONSE_TIME] < 200ms", Severity.WARN)), List.of(), false,
                null, null);
    }

    @Test
    @DisplayName("checks are saved in their own file and listed with the other monitors")
    void saves() {
        definitions.saveCheck(check("tcp_db", CheckMonitorDef.Type.TCP, "db.internal", 1521, null), "Ana");
        definitions.saveCheck(check("png_router", CheckMonitorDef.Type.PING, "10.0.0.1", null, null), "Ana");
        definitions.saveCheck(check("psh_batch", CheckMonitorDef.Type.PUSH, null, null, 1_800), "Ana");

        assertThat(Files.exists(dir.resolve("orbit.checks.json"))).isTrue();
        assertThat(definitions.monitors()).extracting(MonitorDef::kind)
                .containsExactlyInAnyOrder(MonitorKind.TCP, MonitorKind.PING, MonitorKind.PUSH);
        assertThat(definitions.monitor("tcp_db")).map(MonitorDef::name).contains("Check tcp_db");
    }

    @Test
    @DisplayName("TCP needs host and a valid port; ping needs a host; push needs a silence limit")
    void validates() {
        assertThatThrownBy(() -> definitions.saveCheck(check("t1", CheckMonitorDef.Type.TCP, "db", 70_000, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> definitions.saveCheck(check("p1", CheckMonitorDef.Type.PING, " ", null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> definitions.saveCheck(check("s1", CheckMonitorDef.Type.PUSH, null, null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("check ids cannot clash with HTTP or SQL monitors and can be deleted")
    void uniqueAndDelete() {
        definitions.saveCheck(check("tcp_db", CheckMonitorDef.Type.TCP, "db.internal", 1521, null), "Ana");
        assertThat(definitions.deleteCheck("tcp_db")).isTrue();
        assertThat(definitions.deleteCheck("tcp_db")).isFalse();
    }
}
