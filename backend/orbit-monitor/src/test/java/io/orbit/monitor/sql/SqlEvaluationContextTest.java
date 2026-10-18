package io.orbit.monitor.sql;

import io.orbit.monitor.condition.Placeholder;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SqlEvaluationContextTest {

    private final ResultPayload payload = new ResultPayload(
            List.of(new ResultColumn("QTD_PENDENTES", ColumnType.NUMBER, "NUMBER"),
                    new ResultColumn("STATUS", ColumnType.TEXT, "VARCHAR2")),
            List.of(List.of(new BigDecimal("12"), "OK"), List.of(new BigDecimal("3"), "ERRO")),
            87L,
            false);

    private final SqlEvaluationContext ctx = new SqlEvaluationContext(payload);

    @Test
    void rowsEhAQuantidadeDeLinhas() {
        assertThat(ctx.resolve(Placeholder.ROWS, null)).contains(2);
    }

    @Test
    void execTimeEhOTempoEmMs() {
        assertThat(ctx.resolve(Placeholder.EXEC_TIME, null)).contains(87L);
    }

    @Test
    void colLeAPrimeiraLinhaSemDiferenciarCaixa() {
        assertThat(ctx.resolve(Placeholder.COL, "qtd_pendentes")).contains(new BigDecimal("12"));
        assertThat(ctx.resolve(Placeholder.COL, "STATUS")).contains("OK");
    }

    @Test
    void colunaInexistenteOuResultadoVazioNaoTemValor() {
        assertThat(ctx.resolve(Placeholder.COL, "NAO_EXISTE")).isEmpty();
        var vazio = new SqlEvaluationContext(new ResultPayload(payload.columns(), List.of(), 5L, false));
        assertThat(vazio.resolve(Placeholder.COL, "STATUS")).isEmpty();
        assertThat(vazio.resolve(Placeholder.ROWS, null)).contains(0);
    }

    @Test
    void placeholdersHttpNaoExistemNoSql() {
        assertThat(ctx.resolve(Placeholder.STATUS, null)).isEmpty();
    }

    @Test
    void payloadExpoeLinhasComoMapaPorColuna() {
        assertThat(payload.rowAsMap(1)).containsEntry("STATUS", "ERRO").containsEntry("QTD_PENDENTES", new BigDecimal("3"));
    }
}
