package io.orbit.monitor.sql;

import java.sql.Types;

/** Detected type of a SELECT column, used for display suggestions and conditions. */
public enum ColumnType {
    NUMBER,
    TEXT,
    DATE,
    BOOLEAN,
    OTHER;

    /** Maps a {@link java.sql.Types} value from {@code ResultSetMetaData}. */
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
