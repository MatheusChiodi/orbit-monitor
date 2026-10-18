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
    void oneRowOneNumericColumnIsSingleValue() {
        var s = suggester.suggest(payload(List.of(col("QTY", ColumnType.NUMBER)), 1));
        assertThat(s.suggested()).isEqualTo(ReadMode.SINGLE_VALUE);
    }

    @Test
    void oneRowManyColumnsIsIndicatorCard() {
        var cols = List.of(col("PENDING", ColumnType.NUMBER), col("ERROR", ColumnType.NUMBER), col("OK", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 1)).suggested()).isEqualTo(ReadMode.INDICATOR_CARD);
    }

    @Test
    void manyRowsCategoryAndNumberIsRanking() {
        var cols = List.of(col("ACQUIRER", ColumnType.TEXT), col("ERROR_QTY", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 5)).suggested()).isEqualTo(ReadMode.RANKING);
    }

    @Test
    void manyRowsWithDateIsTimeSeries() {
        var cols = List.of(col("DAY", ColumnType.DATE), col("TOTAL", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 24)).suggested()).isEqualTo(ReadMode.TIME_SERIES);
    }

    @Test
    void manyRowsFreeShapeIsTable() {
        var cols = List.of(col("ID", ColumnType.TEXT), col("CUSTOMER", ColumnType.TEXT), col("STATUS", ColumnType.TEXT));
        assertThat(suggester.suggest(payload(cols, 3)).suggested()).isEqualTo(ReadMode.TABLE);
    }

    @Test
    void zeroRowsIsRowCount() {
        var cols = List.of(col("SID", ColumnType.NUMBER), col("BLOCKED_BY", ColumnType.NUMBER));
        assertThat(suggester.suggest(payload(cols, 0)).suggested()).isEqualTo(ReadMode.ROW_COUNT);
    }

    @Test
    void alwaysOffersTableAndRowCountAsAlternatives() {
        var s = suggester.suggest(payload(List.of(col("QTY", ColumnType.NUMBER)), 1));
        assertThat(s.alternatives()).contains(ReadMode.TABLE, ReadMode.ROW_COUNT).doesNotContain(ReadMode.SINGLE_VALUE);
    }
}
