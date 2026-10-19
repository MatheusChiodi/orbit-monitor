package io.orbit.monitor.sql;

import java.util.List;
import java.util.Map;

/**
 * BE-11: named parameters ({@code :days}, {@code :store}) in a SELECT. They are always bound with
 * {@code PreparedStatement.setObject}, never concatenated into the SQL text.
 */
public final class SqlParameters {

    /** SQL with {@code ?} placeholders and the values in binding order. */
    public record Bound(String sql, List<Object> values) {
    }

    private SqlParameters() {
    }

    /** Parameter names in order of appearance; text inside literals and comments is ignored. */
    public static List<String> names(String sql) {
        throw new UnsupportedOperationException("BE-11 SQL parameters are not implemented yet");
    }

    /** Replaces each {@code :name} by {@code ?}; a missing value is an {@link UnsafeSqlException}. */
    public static Bound bind(String sql, Map<String, Object> values) {
        throw new UnsupportedOperationException("BE-11 SQL parameters are not implemented yet");
    }
}
