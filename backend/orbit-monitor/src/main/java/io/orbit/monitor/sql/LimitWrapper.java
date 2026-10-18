package io.orbit.monitor.sql;

import java.util.Locale;

/**
 * Envolve o SELECT validado num limite de linhas por dialeto. O executor ainda aplica
 * {@code Statement.setMaxRows} como segunda barreira, que cobre o caso sem embrulho.
 */
public class LimitWrapper {

    private static final String ALIAS = "orbit_q";

    public String wrap(String sql, Dialect dialect, int maxRows) {
        if (maxRows <= 0) {
            throw new IllegalArgumentException("maxRows deve ser positivo");
        }
        return switch (dialect) {
            case ORACLE -> "SELECT * FROM (" + sql + ") WHERE ROWNUM <= " + maxRows;
            case POSTGRES, MYSQL, H2 -> "SELECT * FROM (" + sql + ") " + ALIAS + " LIMIT " + maxRows;
            // SQL Server não aceita CTE dentro de subconsulta: nesse caso o limite fica só no setMaxRows.
            case SQLSERVER -> startsWithCte(sql)
                    ? sql
                    : "SELECT TOP (" + maxRows + ") * FROM (" + sql + ") " + ALIAS;
        };
    }

    private static boolean startsWithCte(String sql) {
        return SqlText.codeOnly(sql).strip().toUpperCase(Locale.ROOT).startsWith("WITH");
    }
}
