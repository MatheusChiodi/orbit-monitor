package io.orbit.monitor.sql;

import io.orbit.monitor.condition.Placeholder;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SqlEvaluationContextTest {

    private final ResultPayload payload = new ResultPayload(
            List.of(new ResultColumn("PENDING_QTY", ColumnType.NUMBER, "NUMBER"),
                    new ResultColumn("STATUS", ColumnType.TEXT, "VARCHAR2")),
            List.of(List.of(new BigDecimal("12"), "OK"), List.of(new BigDecimal("3"), "ERROR")),
            87L,
            false);

    private final SqlEvaluationContext ctx = new SqlEvaluationContext(payload);

    @Test
    void rowsIsTheRowCount() {
        assertThat(ctx.resolve(Placeholder.ROWS, null)).contains(2);
    }

    @Test
    void execTimeIsMilliseconds() {
        assertThat(ctx.resolve(Placeholder.EXEC_TIME, null)).contains(87L);
    }

    @Test
    void colReadsFirstRowCaseInsensitively() {
        assertThat(ctx.resolve(Placeholder.COL, "pending_qty")).contains(new BigDecimal("12"));
        assertThat(ctx.resolve(Placeholder.COL, "STATUS")).contains("OK");
    }

    @Test
    void missingColumnOrEmptyResultHasNoValue() {
        assertThat(ctx.resolve(Placeholder.COL, "MISSING")).isEmpty();
        var empty = new SqlEvaluationContext(new ResultPayload(payload.columns(), List.of(), 5L, false));
        assertThat(empty.resolve(Placeholder.COL, "STATUS")).isEmpty();
        assertThat(empty.resolve(Placeholder.ROWS, null)).contains(0);
    }

    @Test
    void httpPlaceholdersDoNotExistInSql() {
        assertThat(ctx.resolve(Placeholder.STATUS, null)).isEmpty();
    }

    @Test
    void payloadExposesRowsAsColumnMap() {
        assertThat(payload.rowAsMap(1)).containsEntry("STATUS", "ERROR").containsEntry("PENDING_QTY", new BigDecimal("3"));
    }
}
