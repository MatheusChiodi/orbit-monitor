package io.orbit.monitor.sql;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReadModeSuggesterTest {

    private final ReadModeSuggester suggester = new ReadModeSuggester();

    private static ResultColumn col(String name, ColumnType type) {
        return new ResultColumn(name, type, type.name());
    }

    private static ResultPayload payload(List<ResultColumn> cols, int rows) {
        List<List<Object>> data = new ArrayList<>();
        for (int i = 0; i < rows; i++) {
            List<Object> row = new ArrayList<>();
            cols.forEach(c -> row.add(switch (c.type()) {
                case NUMBER -> BigDecimal.ONE;
                case DATE -> LocalDateTime.now();
                default -> "x";
            }));
            data.add(row);
        }
        return new ResultPayload(cols, data, 10L, false);
    }

    @Test
    void umaLinhaUmaColunaNumericaEhValorUnico() {
        var s = suggester.suggest(payload(List.of(col("QTD", ColumnType.NUMBER)), 1));
        assertThat(s.suggested()).isEqualTo(ReadMode.SINGLE_VALUE);
    }

    @Test
    void umaLinhaVariasColunasEhCartaoDeIndicadores() {
        var cols = List.of(col("PENDENTES", ColumnType.NUMBER), col("ERRO", ColumnType.NUMBER), col("OK", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 1)).suggested()).isEqualTo(ReadMode.INDICATOR_CARD);
    }

    @Test
    void variasLinhasCategoriaENumeroEhRanking() {
        var cols = List.of(col("ADQUIRENTE", ColumnType.TEXT), col("QTD_ERRO", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 5)).suggested()).isEqualTo(ReadMode.RANKING);
    }

    @Test
    void variasLinhasComDataEhSerieTemporal() {
        var cols = List.of(col("DIA", ColumnType.DATE), col("TOTAL", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 24)).suggested()).isEqualTo(ReadMode.TIME_SERIES);
    }

    @Test
    void variasLinhasFormatoLivreEhTabela() {
        var cols = List.of(col("ID", ColumnType.TEXT), col("CLIENTE", ColumnType.TEXT), col("STATUS", ColumnType.TEXT));
        assertThat(suggester.suggest(payload(cols, 3)).suggested()).isEqualTo(ReadMode.TABLE);
    }

    @Test
    void zeroLinhasEhContagemDeLinhas() {
        var cols = List.of(col("SID", ColumnType.NUMBER), col("BLOQUEADO_POR", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 0)).suggested()).isEqualTo(ReadMode.ROW_COUNT);
    }

    @Test
    void sempreOfereceTabelaEContagemComoAlternativas() {
        var s = suggester.suggest(payload(List.of(col("QTD", ColumnType.NUMBER)), 1));
        assertThat(s.alternatives()).contains(ReadMode.TABLE, ReadMode.ROW_COUNT).doesNotContain(ReadMode.SINGLE_VALUE);
    }
}
