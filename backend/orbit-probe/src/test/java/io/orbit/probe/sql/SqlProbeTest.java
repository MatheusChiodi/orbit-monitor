package io.orbit.probe.sql;

import io.orbit.monitor.sql.ColumnType;
import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.LimitWrapper;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.SelectValidator;
import io.orbit.monitor.sql.UnsafeSqlException;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLTimeoutException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SqlProbeTest {

    private final SqlProbe probe = new SqlProbe(new SelectValidator(), new LimitWrapper());
    private final SqlProbeOptions options = new SqlProbeOptions(3, Duration.ofSeconds(5), 50);
    private DataSource h2;

    @BeforeEach
    void createDatabase() throws Exception {
        JdbcDataSource ds = new JdbcDataSource();
        ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        try (Connection c = ds.getConnection(); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE batch (id INT, status VARCHAR(20), amount DECIMAL(10,2), "
                    + "created_at TIMESTAMP, business_day DATE)");
            for (int i = 1; i <= 5; i++) {
                st.execute("INSERT INTO batch VALUES (" + i + ", 'OK', " + i + ".50, "
                        + "TIMESTAMP '2026-10-18 10:0" + i + ":00', DATE '2026-10-18')");
            }
        }
        h2 = ds;
    }

    @Test
    void returnsTypedColumnsRowsAndTime() {
        ResultPayload r = probe.execute(h2, Dialect.H2,
                "SELECT id, status, amount, created_at, business_day FROM batch WHERE id = 1", options);

        assertThat(r.columns()).extracting(ResultColumn::name, ResultColumn::type).containsExactly(
                org.assertj.core.groups.Tuple.tuple("ID", ColumnType.NUMBER),
                org.assertj.core.groups.Tuple.tuple("STATUS", ColumnType.TEXT),
                org.assertj.core.groups.Tuple.tuple("AMOUNT", ColumnType.NUMBER),
                org.assertj.core.groups.Tuple.tuple("CREATED_AT", ColumnType.DATE),
                org.assertj.core.groups.Tuple.tuple("BUSINESS_DAY", ColumnType.DATE));
        assertThat(r.rows()).hasSize(1);
        assertThat(r.rows().getFirst()).containsExactly(1, "OK", new BigDecimal("1.50"),
                LocalDateTime.of(2026, 10, 18, 10, 1), LocalDate.of(2026, 10, 18));
        assertThat(r.ms()).isGreaterThanOrEqualTo(0);
        assertThat(r.truncated()).isFalse();
    }

    @Test
    void truncatesAtMaxRows() {
        ResultPayload r = probe.execute(h2, Dialect.H2, "SELECT id FROM batch ORDER BY id", options);

        assertThat(r.rowCount()).isEqualTo(3);
        assertThat(r.truncated()).isTrue();
    }

    @Test
    void exactlyMaxRowsIsNotTruncated() {
        ResultPayload r = probe.execute(h2, Dialect.H2, "SELECT id FROM batch WHERE id <= 3", options);

        assertThat(r.rowCount()).isEqualTo(3);
        assertThat(r.truncated()).isFalse();
    }

    @Test
    void emptyResultKeepsColumns() {
        ResultPayload r = probe.execute(h2, Dialect.H2, "SELECT id, status FROM batch WHERE 1 = 0", options);

        assertThat(r.rowCount()).isZero();
        assertThat(r.columns()).hasSize(2);
    }

    @Test
    void rejectsUnsafeSqlBeforeTouchingTheDatabase() {
        DataSource ds = mock(DataSource.class);

        assertThatThrownBy(() -> probe.execute(ds, Dialect.H2, "DELETE FROM batch", options))
                .isInstanceOf(UnsafeSqlException.class);
        verifyNoInteractions(ds);
    }

    @Test
    void appliesReadOnlyTimeoutFetchSizeAndMaxRows() throws Exception {
        DataSource ds = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rs = mock(ResultSet.class);
        ResultSetMetaData meta = mock(ResultSetMetaData.class);
        when(ds.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rs);
        when(rs.getMetaData()).thenReturn(meta);
        when(meta.getColumnCount()).thenReturn(1);
        when(meta.getColumnLabel(1)).thenReturn("QTY");
        when(meta.getColumnType(1)).thenReturn(Types.INTEGER);
        when(meta.getColumnTypeName(1)).thenReturn("INTEGER");
        when(rs.next()).thenReturn(true, false);
        when(rs.getObject(1)).thenReturn(7);

        var opts = new SqlProbeOptions(10, Duration.ofMillis(2_500), 25);
        ResultPayload r = probe.execute(ds, Dialect.ORACLE, "SELECT 7 AS qty FROM dual", opts);

        assertThat(r.rows().getFirst()).containsExactly(7);
        verify(connection).setReadOnly(true);
        verify(connection).prepareStatement("SELECT * FROM (SELECT 7 AS qty FROM dual) WHERE ROWNUM <= 11");
        verify(statement).setQueryTimeout(3);
        verify(statement).setFetchSize(25);
        verify(statement).setMaxRows(11);
        verify(rs).close();
        verify(statement).close();
        verify(connection).close();
    }

    @Test
    void timeoutBecomesSqlProbeException() throws Exception {
        DataSource ds = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        when(ds.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenThrow(new SQLTimeoutException("cancelled"));

        assertThatThrownBy(() -> probe.execute(ds, Dialect.POSTGRES, "SELECT 1", options))
                .isInstanceOfSatisfying(SqlProbeException.class, e -> assertThat(e.isTimeout()).isTrue());
    }

    @Test
    void sqlErrorBecomesSqlProbeException() {
        assertThatThrownBy(() -> probe.execute(h2, Dialect.H2, "SELECT missing_column FROM batch", options))
                .isInstanceOfSatisfying(SqlProbeException.class, e -> assertThat(e.isTimeout()).isFalse());
    }

    @Test
    void optionsAreValidated() {
        assertThatThrownBy(() -> new SqlProbeOptions(0, Duration.ofSeconds(1), 10))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SqlProbeOptions(10, Duration.ZERO, 10))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(SqlProbeOptions.defaults().maxRows()).isEqualTo(500);
    }
}
