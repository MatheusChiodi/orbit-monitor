package io.orbit.api.runtime;

import io.orbit.common.MonitorState;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.definition.ConditionDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.monitor.sql.ColumnType;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.probe.CheckResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PrimaryValueTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private final ConditionParser parser = new ConditionParser();

    private static SqlMonitorDef select(List<ConditionDef> conditions) {
        return new SqlMonitorDef("sel", "Queue", "grp", "con", "SELECT 1", 60, 30_000, 500, 1, 0.1, false,
                conditions, List.of(), false, null, null);
    }

    private static HttpMonitorDef request(List<ConditionDef> conditions) {
        return new HttpMonitorDef("req", "Portal", "grp", "GET", "https://x.example.com", Map.of(), Map.of(), null,
                30, 5_000, true, 1, 0.1, false, conditions, List.of(), false, null, null);
    }

    private CheckResult result(Object payload, List<ConditionResult> conditions, long latency) {
        return new CheckResult("m", MonitorState.OK, latency, payload, conditions, null, NOW);
    }

    @Test
    void ruleAndValueComeFromTheFirstNumericComparison() {
        var def = select(List.of(new ConditionDef("[COL].PENDING_QTY < 200", Severity.DOWN)));
        var condition = parser.parse("[COL].PENDING_QTY < 200", Severity.DOWN);
        var check = result(null, List.of(new ConditionResult(condition, false, new BigDecimal("347"), "x")), 10);

        PrimaryValue primary = PrimaryValue.of(def, check);

        assertThat(primary.value()).isEqualTo(347.0);
        assertThat(primary.rule()).isEqualTo(new PrimaryValue.Rule("PENDING_QTY", "<", 200.0));
        assertThat(primary.unit()).isNull();
    }

    @Test
    void durationRulesUseMilliseconds() {
        var def = request(List.of(new ConditionDef("[STATUS] == 200", Severity.DOWN),
                new ConditionDef("[RESPONSE_TIME] < 800ms", Severity.WARN)));
        var status = parser.parse("[STATUS] == 200", Severity.DOWN);
        var time = parser.parse("[RESPONSE_TIME] < 800ms", Severity.WARN);
        var check = result(null, List.of(new ConditionResult(status, true, 200, "ok"),
                new ConditionResult(time, true, 312L, "ok")), 312);

        PrimaryValue primary = PrimaryValue.of(def, check);

        assertThat(primary.rule()).isEqualTo(new PrimaryValue.Rule("RESPONSE_TIME", "<", 800.0));
        assertThat(primary.value()).isEqualTo(312.0);
        assertThat(primary.unit()).isEqualTo("ms");
    }

    @Test
    void withoutARuleHttpFallsBackToLatency() {
        PrimaryValue primary = PrimaryValue.of(request(List.of()), result(null, List.of(), 95));
        assertThat(primary.value()).isEqualTo(95.0);
        assertThat(primary.unit()).isEqualTo("ms");
        assertThat(primary.rule()).isNull();
    }

    @Test
    void withoutARuleSqlUsesTheFirstNumberOfTheFirstRow() {
        var payload = new ResultPayload(List.of(new ResultColumn("NAME", ColumnType.TEXT, "VARCHAR"),
                new ResultColumn("QTY", ColumnType.NUMBER, "NUMBER")), List.of(List.of("a", 7)), 3L, false);
        assertThat(PrimaryValue.of(select(List.of()), result(payload, List.of(), 3)).value()).isEqualTo(7.0);
    }

    @Test
    void failedChecksHaveNoValue() {
        var failed = new CheckResult("m", MonitorState.DOWN, 0, null, List.of(), "Timed out", NOW);
        assertThat(PrimaryValue.of(request(List.of()), failed).value()).isNull();
    }

    @Test
    void maskedTextIsNotAValue() {
        var def = select(List.of(new ConditionDef("[COL].REF > 0", Severity.DOWN)));
        var condition = parser.parse("[COL].REF > 0", Severity.DOWN);
        var check = result(null, List.of(new ConditionResult(condition, true, "•••• •••• •••• 1111", "ok")), 1);
        assertThat(PrimaryValue.of(def, check).value()).isNull();
    }
}
