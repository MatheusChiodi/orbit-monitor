package io.orbit.probe.sql;

import io.orbit.monitor.sql.ColumnType;
import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.LimitWrapper;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.SelectValidator;
import io.orbit.monitor.sql.ValidatedSelect;

import javax.sql.DataSource;
import java.io.IOException;
import java.io.Reader;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Runs a monitor SELECT on a target database: validates it (safe mode), wraps it in a row limit,
 * and executes it on a read-only connection with statement timeout, fetch size and max rows.
 */
public class SqlProbe {

    private final SelectValidator validator;
    private final LimitWrapper limitWrapper;

    public SqlProbe(SelectValidator validator, LimitWrapper limitWrapper) {
        this.validator = validator;
        this.limitWrapper = limitWrapper;
    }

    public ResultPayload execute(DataSource dataSource, Dialect dialect, String sql, SqlProbeOptions options) {
        ValidatedSelect select = validator.validate(sql);
        // One extra row tells whether the result was truncated.
        int fetchLimit = options.maxRows() + 1;
        String wrapped = limitWrapper.wrap(select.sql(), dialect, fetchLimit);
        long start = System.nanoTime();
        try (Connection connection = dataSource.getConnection()) {
            connection.setReadOnly(true);
            try (PreparedStatement statement = connection.prepareStatement(wrapped)) {
                statement.setQueryTimeout(options.timeoutSeconds());
                statement.setFetchSize(options.fetchSize());
                statement.setMaxRows(fetchLimit);
                try (ResultSet rs = statement.executeQuery()) {
                    List<ResultColumn> columns = columns(rs.getMetaData());
                    List<List<Object>> rows = new ArrayList<>();
                    boolean truncated = false;
                    while (rs.next()) {
                        if (rows.size() == options.maxRows()) {
                            truncated = true;
                            break;
                        }
                        rows.add(row(rs, columns.size()));
                    }
                    long ms = Duration.ofNanos(System.nanoTime() - start).toMillis();
                    return new ResultPayload(columns, rows, ms, truncated);
                }
            }
        } catch (SQLTimeoutException e) {
            throw new SqlProbeException("Query timed out after " + options.timeout().toMillis() + " ms", true, e);
        } catch (SQLException e) {
            throw new SqlProbeException("Query failed: " + e.getMessage(), false, e);
        }
    }

    private static List<ResultColumn> columns(ResultSetMetaData meta) throws SQLException {
        List<ResultColumn> columns = new ArrayList<>(meta.getColumnCount());
        for (int i = 1; i <= meta.getColumnCount(); i++) {
            columns.add(new ResultColumn(meta.getColumnLabel(i), ColumnType.fromJdbc(meta.getColumnType(i)),
                    meta.getColumnTypeName(i)));
        }
        return columns;
    }

    private static List<Object> row(ResultSet rs, int columnCount) throws SQLException {
        List<Object> row = new ArrayList<>(columnCount);
        for (int i = 1; i <= columnCount; i++) {
            row.add(normalize(rs.getObject(i)));
        }
        return row;
    }

    /** Converts JDBC-specific types into plain Java values that serialize and compare predictably. */
    static Object normalize(Object value) throws SQLException {
        return switch (value) {
            case null -> null;
            case Timestamp ts -> ts.toLocalDateTime();
            case java.sql.Date d -> d.toLocalDate();
            case Time t -> t.toLocalTime();
            case Clob clob -> readClob(clob);
            default -> value;
        };
    }

    private static String readClob(Clob clob) throws SQLException {
        try (Reader reader = clob.getCharacterStream()) {
            StringBuilder sb = new StringBuilder();
            char[] buffer = new char[4096];
            int read;
            while ((read = reader.read(buffer)) != -1) {
                sb.append(buffer, 0, read);
            }
            return sb.toString();
        } catch (IOException e) {
            throw new SQLException("Could not read CLOB", e);
        }
    }
}
