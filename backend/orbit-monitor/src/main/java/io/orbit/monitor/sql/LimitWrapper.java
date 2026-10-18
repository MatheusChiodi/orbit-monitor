package io.orbit.monitor.sql;

import java.util.Locale;

/**
 * Wraps a validated SELECT in a dialect-specific row limit. The executor also applies
 * {@code Statement.setMaxRows} as a second barrier, which covers the unwrapped case.
 */
public class LimitWrapper {

    private static final String ALIAS = "orbit_q";

    public String wrap(String sql, Dialect dialect, int maxRows) {
        if (maxRows <= 0) {
            throw new IllegalArgumentException("maxRows must be positive");
        }
        return switch (dialect) {
            case ORACLE -> "SELECT * FROM (" + sql + ") WHERE ROWNUM <= " + maxRows;
            case POSTGRES, MYSQL, H2 -> "SELECT * FROM (" + sql + ") " + ALIAS + " LIMIT " + maxRows;
            // SQL Server rejects a CTE inside a derived table: the limit then relies on setMaxRows only.
            case SQLSERVER -> startsWithCte(sql)
                    ? sql
                    : "SELECT TOP (" + maxRows + ") * FROM (" + sql + ") " + ALIAS;
        };
    }

    private static boolean startsWithCte(String sql) {
        return SqlText.codeOnly(sql).strip().toUpperCase(Locale.ROOT).startsWith("WITH");
    }
}
