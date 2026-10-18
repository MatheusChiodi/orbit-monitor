package io.orbit.monitor.sql;

import java.sql.Types;

/** Tipo detectado de uma coluna do SELECT, usado na sugestão de exibição e nas condições. */
public enum ColumnType {
    NUMBER,
    TEXT,
    DATE,
    BOOLEAN,
    OTHER;

    /** Converte um {@link java.sql.Types} vindo do {@code ResultSetMetaData}. */
    public static ColumnType fromJdbc(int sqlType) {
        return switch (sqlType) {
            case Types.TINYINT, Types.SMALLINT, Types.INTEGER, Types.BIGINT, Types.FLOAT, Types.REAL,
                 Types.DOUBLE, Types.NUMERIC, Types.DECIMAL -> NUMBER;
            case Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR, Types.NCHAR, Types.NVARCHAR,
                 Types.LONGNVARCHAR, Types.CLOB, Types.NCLOB -> TEXT;
            case Types.DATE, Types.TIME, Types.TIMESTAMP, Types.TIME_WITH_TIMEZONE,
                 Types.TIMESTAMP_WITH_TIMEZONE -> DATE;
            case Types.BIT, Types.BOOLEAN -> BOOLEAN;
            default -> OTHER;
        };
    }
}
