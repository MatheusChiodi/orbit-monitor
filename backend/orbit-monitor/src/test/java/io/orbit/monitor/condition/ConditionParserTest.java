package io.orbit.monitor.condition;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConditionParserTest {

    private final ConditionParser parser = new ConditionParser();

    @Test
    void interpretaStatusIgualANumero() {
        Condition c = parser.parse("[STATUS] == 200", Severity.DOWN);

        assertThat(c.placeholder()).isEqualTo(Placeholder.STATUS);
        assertThat(c.path()).isNull();
        assertThat(c.operator()).isEqualTo(Operator.EQ);
        assertThat(c.operand()).isEqualTo(new Operand.NumberOperand(new BigDecimal("200")));
        assertThat(c.severity()).isEqualTo(Severity.DOWN);
        assertThat(c.expression()).isEqualTo("[STATUS] == 200");
    }

    @Test
    void interpretaDuracaoEmMilissegundos() {
        Condition c = parser.parse("[RESPONSE_TIME] < 800ms", Severity.WARN);

        assertThat(c.operator()).isEqualTo(Operator.LT);
        assertThat(c.operand()).isEqualTo(new Operand.DurationOperand(Duration.ofMillis(800)));
    }

    @Test
    void interpretaDuracaoEmSegundosEMinutos() {
        assertThat(parser.parse("[EXEC_TIME] < 2s", Severity.DOWN).operand())
                .isEqualTo(new Operand.DurationOperand(Duration.ofSeconds(2)));
        assertThat(parser.parse("[EXEC_TIME] <= 1.5min", Severity.DOWN).operand())
                .isEqualTo(new Operand.DurationOperand(Duration.ofSeconds(90)));
    }

    @Test
    void interpretaCaminhoJsonDoBodyETextoEntreAspas() {
        Condition c = parser.parse("[BODY].status == \"UP\"", Severity.DOWN);

        assertThat(c.placeholder()).isEqualTo(Placeholder.BODY);
        assertThat(c.path()).isEqualTo("status");
        assertThat(c.operand()).isEqualTo(new Operand.TextOperand("UP"));
    }

    @Test
    void interpretaColunaComPath() {
        Condition c = parser.parse("[COL].QTD_PENDENTES < 50", Severity.WARN);

        assertThat(c.placeholder()).isEqualTo(Placeholder.COL);
        assertThat(c.path()).isEqualTo("QTD_PENDENTES");
        assertThat(c.operator()).isEqualTo(Operator.LT);
    }

    @Test
    void interpretaTempoRelativoAAgora() {
        Condition c = parser.parse("[COL].ULT_LOTE > now() - 60min", Severity.DOWN);

        assertThat(c.operand()).isEqualTo(new Operand.RelativeTimeOperand(Duration.ofMinutes(-60)));
    }

    @Test
    void interpretaBetween() {
        Condition c = parser.parse("[COL].PCT between 1 and 5.5", Severity.WARN);

        assertThat(c.operator()).isEqualTo(Operator.BETWEEN);
        assertThat(c.operand()).isEqualTo(new Operand.RangeOperand(
                new Operand.NumberOperand(new BigDecimal("1")),
                new Operand.NumberOperand(new BigDecimal("5.5"))));
    }

    @Test
    void interpretaInComListaMista() {
        Condition c = parser.parse("[STATUS] in (200, 201, \"204\")", Severity.DOWN);

        assertThat(c.operator()).isEqualTo(Operator.IN);
        assertThat(c.operand()).isEqualTo(new Operand.ListOperand(List.of(
                new Operand.NumberOperand(new BigDecimal("200")),
                new Operand.NumberOperand(new BigDecimal("201")),
                new Operand.TextOperand("204"))));
    }

    @Test
    void interpretaOlderThan() {
        Condition c = parser.parse("[COL].DT_ULT_LOTE older than 10min", Severity.DOWN);

        assertThat(c.operator()).isEqualTo(Operator.OLDER_THAN);
        assertThat(c.operand()).isEqualTo(new Operand.DurationOperand(Duration.ofMinutes(10)));
    }

    @Test
    void interpretaContainsEPlaceholderEmMinusculas() {
        Condition c = parser.parse("  [body] contains \"pong\"  ", Severity.DOWN);

        assertThat(c.placeholder()).isEqualTo(Placeholder.BODY);
        assertThat(c.operator()).isEqualTo(Operator.CONTAINS);
        assertThat(c.operand()).isEqualTo(new Operand.TextOperand("pong"));
    }

    @Test
    void palavraSemAspasViraTexto() {
        assertThat(parser.parse("[BODY].status != DOWN", Severity.DOWN).operand())
                .isEqualTo(new Operand.TextOperand("DOWN"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "STATUS == 200",
            "[NADA] == 1",
            "[STATUS] === 200",
            "[STATUS] ==",
            "[COL] < 10",
            "[ROWS].x == 1",
            "[COL].X between 1",
            "[COL].X older than 10",
            "[STATUS] in 200"
    })
    void rejeitaExpressoesInvalidas(String expr) {
        assertThatThrownBy(() -> parser.parse(expr, Severity.DOWN))
                .isInstanceOf(ConditionSyntaxException.class);
    }
}
