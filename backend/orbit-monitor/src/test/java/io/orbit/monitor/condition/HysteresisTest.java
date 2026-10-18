package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HysteresisTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private final ConditionParser parser = new ConditionParser();
    private final ConditionEngine engine = new ConditionEngine(Clock.fixed(NOW, ZoneOffset.UTC));

    private Operand tightened(String expression) {
        return Hysteresis.tighten(parser.parse(expression, Severity.WARN), 0.10).operand();
    }

    @Test
    void upperBoundMovesDown() {
        assertThat(tightened("[COL].QTY < 200")).isEqualTo(new Operand.NumberOperand(new BigDecimal("180.0")));
        assertThat(tightened("[RESPONSE_TIME] <= 800ms")).isEqualTo(new Operand.DurationOperand(Duration.ofMillis(720)));
    }

    @Test
    void lowerBoundMovesUp() {
        assertThat(tightened("[COL].RATE > 50")).isEqualTo(new Operand.NumberOperand(new BigDecimal("55.0")));
        assertThat(tightened("[COL].LAST_BATCH > now() - 60min"))
                .isEqualTo(new Operand.RelativeTimeOperand(Duration.ofMinutes(-54)));
    }

    @Test
    void rangeShrinksOnBothSides() {
        assertThat(tightened("[COL].PCT between 0 and 10")).isEqualTo(new Operand.RangeOperand(
                new Operand.NumberOperand(new BigDecimal("0.5")), new Operand.NumberOperand(new BigDecimal("9.5"))));
    }

    @Test
    void ageConditionsGetStricter() {
        assertThat(tightened("[COL].AT newer than 10min")).isEqualTo(new Operand.DurationOperand(Duration.ofMinutes(9)));
        assertThat(tightened("[COL].AT older than 10min")).isEqualTo(new Operand.DurationOperand(Duration.ofMinutes(11)));
    }

    @Test
    void equalityAndTextAreUnchanged() {
        Condition eq = parser.parse("[STATUS] == 200", Severity.DOWN);
        assertThat(Hysteresis.tighten(eq, 0.10)).isEqualTo(eq);
        Condition text = parser.parse("[BODY].status == UP", Severity.DOWN);
        assertThat(Hysteresis.tighten(text, 0.10)).isEqualTo(text);
    }

    @Test
    void tightenedConditionKeepsExpressionAndSeverity() {
        Condition c = Hysteresis.tighten(parser.parse("[COL].QTY < 200", Severity.WARN), 0.10);
        assertThat(c.expression()).isEqualTo("[COL].QTY < 200");
        assertThat(c.severity()).isEqualTo(Severity.WARN);
    }

    @Test
    void leavingWarnRequiresTheMargin() {
        var conditions = List.of(parser.parse("[COL].QTY < 200", Severity.WARN));
        var ctx = new MapEvaluationContext().with(Placeholder.COL, "QTY", 190);

        assertThat(engine.evaluateAll(conditions, ctx, MonitorState.OK, 0.10).state()).isEqualTo(MonitorState.OK);
        assertThat(engine.evaluateAll(conditions, ctx, MonitorState.WARN, 0.10).state()).isEqualTo(MonitorState.WARN);
        var recovered = new MapEvaluationContext().with(Placeholder.COL, "QTY", 170);
        assertThat(engine.evaluateAll(conditions, recovered, MonitorState.WARN, 0.10).state()).isEqualTo(MonitorState.OK);
    }

    @Test
    void zeroHysteresisBehavesLikePlainEvaluation() {
        var conditions = List.of(parser.parse("[COL].QTY < 200", Severity.WARN));
        var ctx = new MapEvaluationContext().with(Placeholder.COL, "QTY", 199);
        assertThat(engine.evaluateAll(conditions, ctx, MonitorState.DOWN, 0).state()).isEqualTo(MonitorState.OK);
    }
}
