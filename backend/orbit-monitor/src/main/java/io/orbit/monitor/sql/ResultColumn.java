package io.orbit.monitor.sql;

/** Result column: name, detected type and the source database type name. */
public record ResultColumn(String name, ColumnType type, String dbTypeName) {
}
