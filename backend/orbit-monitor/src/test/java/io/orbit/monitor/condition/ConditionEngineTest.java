package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConditionEngineTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private final ConditionParser parser = new ConditionParser();
    private final ConditionEngine engine = new ConditionEngine(Clock.fixed(NOW, ZoneOffset.UTC));

    private ConditionResult eval(String expr, EvaluationContext ctx) {
        return engine.evaluate(parser.parse(expr, Severity.DOWN), ctx);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "[STATUS] == 200      | 200 | true",
            "[STATUS] == 200      | 500 | false",
            "[STATUS] != 200      | 500 | true",
            "[STATUS] < 400       | 302 | true",
            "[STATUS] <= 399      | 400 | false",
            "[STATUS] > 199       | 200 | true",
            "[STATUS] >= 300      | 299 | false",
            "[STATUS] between 200 and 299 | 204 | true",
            "[STATUS] between 200 and 299 | 301 | false",
            "[STATUS] in (200, 201) | 201 | true",
            "[STATUS] in (200, 201) | 404 | false"
    })
    void operadoresNumericos(String expr, int status, boolean expected) {
        var ctx = new MapEvaluationContext().with(Placeholder.STATUS, status);
        assertThat(eval(expr, ctx).passed()).isEqualTo(expected);
    }

    @Test
    void duracaoComparaEmMilissegundos() {
        var ctx = new MapEvaluationContext().with(Placeholder.RESPONSE_TIME, 750L);
        assertThat(eval("[RESPONSE_TIME] < 800ms", ctx).passed()).isTrue();
        assertThat(eval("[RESPONSE_TIME] < 0.5s", ctx).passed()).isFalse();
        assertThat(eval("[RESPONSE_TIME] < 800", ctx).passed()).isTrue();
    }

    @Test
    void textoIgualEDiferente() {
        var ctx = new MapEvaluationContext().with(Placeholder.BODY, "status", "UP");
        assertThat(eval("[BODY].status == \"UP\"", ctx).passed()).isTrue();
        assertThat(eval("[BODY].status != UP", ctx).passed()).isFalse();
        assertThat(eval("[BODY].status in (UP, DEGRADED)", ctx).passed()).isTrue();
    }

    @Test
    void numeroVindoComoTextoEhConvertido() {
        var ctx = new MapEvaluationContext().with(Placeholder.COL, "QTD", "42");
        assertThat(eval("[COL].QTD < 50", ctx).passed()).isTrue();
    }

    @Test
    void containsProcuraSubstring() {
        var ctx = new MapEvaluationContext().with(Placeholder.BODY, "{\"msg\":\"pong\"}");
        assertThat(eval("[BODY] contains \"pong\"", ctx).passed()).isTrue();
        assertThat(eval("[BODY] contains ping", ctx).passed()).isFalse();
    }

    @Test
    void olderThanENewerThanUsamORelogio() {
        var ctx = new MapEvaluationContext()
                .with(Placeholder.COL, "ANTIGO", NOW.minusSeconds(15 * 60))
                .with(Placeholder.COL, "RECENTE", LocalDateTime.ofInstant(NOW.minusSeconds(60), ZoneOffset.UTC));
        assertThat(eval("[COL].ANTIGO older than 10min", ctx).passed()).isTrue();
        assertThat(eval("[COL].RECENTE older than 10min", ctx).passed()).isFalse();
        assertThat(eval("[COL].RECENTE newer than 10min", ctx).passed()).isTrue();
    }

    @Test
    void comparacaoComNowMenosDuracao() {
        var ctx = new MapEvaluationContext().with(Placeholder.COL, "ULT_LOTE", NOW.minusSeconds(30 * 60));
        assertThat(eval("[COL].ULT_LOTE > now() - 60min", ctx).passed()).isTrue();
        assertThat(eval("[COL].ULT_LOTE > now() - 10min", ctx).passed()).isFalse();
    }

    @Test
    void valorAusenteFalhaComMensagem() {
        ConditionResult r = eval("[COL].X < 50", new MapEvaluationContext());
        assertThat(r.passed()).isFalse();
        assertThat(r.message()).contains("sem valor");
    }

    @Test
    void tiposIncompativeisFalhamSemExcecao() {
        var ctx = new MapEvaluationContext().with(Placeholder.BODY, "status", "UP");
        ConditionResult r = eval("[BODY].status < 10", ctx);
        assertThat(r.passed()).isFalse();
        assertThat(r.message()).isNotBlank();
    }

    @Test
    void resultadoGuardaValorAtual() {
        var ctx = new MapEvaluationContext().with(Placeholder.ROWS, 3);
        ConditionResult r = eval("[ROWS] == 0", ctx);
        assertThat(r.passed()).isFalse();
        assertThat(r.actual()).isEqualTo(3);
    }

    @Test
    void estadoFinalEhOPiorNivelQueFalhou() {
        var ctx = new MapEvaluationContext()
                .with(Placeholder.STATUS, 200)
                .with(Placeholder.RESPONSE_TIME, 1200L);
        var conds = List.of(
                parser.parse("[STATUS] == 200", Severity.DOWN),
                parser.parse("[RESPONSE_TIME] < 800ms", Severity.WARN));

        Evaluation ev = engine.evaluateAll(conds, ctx);

        assertThat(ev.state()).isEqualTo(MonitorState.WARN);
        assertThat(ev.results()).hasSize(2);
        assertThat(ev.failures()).extracting(r -> r.condition().expression())
                .containsExactly("[RESPONSE_TIME] < 800ms");
    }

    @Test
    void falhaCriticaPrevaleceSobreAtencao() {
        var ctx = new MapEvaluationContext().with(Placeholder.STATUS, 500).with(Placeholder.RESPONSE_TIME, 1200L);
        var conds = List.of(
                parser.parse("[STATUS] == 200", Severity.DOWN),
                parser.parse("[RESPONSE_TIME] < 800ms", Severity.WARN));
        assertThat(engine.evaluateAll(conds, ctx).state()).isEqualTo(MonitorState.DOWN);
    }

    @Test
    void semFalhasEhOk() {
        var ctx = new MapEvaluationContext().with(Placeholder.COL, "PCT", new BigDecimal("1.2"));
        var conds = List.of(parser.parse("[COL].PCT < 2", Severity.WARN));
        assertThat(engine.evaluateAll(conds, ctx).state()).isEqualTo(MonitorState.OK);
    }

    @Test
    void cadaOperadorTemUmAvaliadorRegistrado() {
        for (Operator op : Operator.values()) {
            assertThat(engine.evaluatorFor(op)).as(op.name()).isNotNull();
        }
    }
}
