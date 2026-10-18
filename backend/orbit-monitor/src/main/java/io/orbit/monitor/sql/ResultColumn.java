package io.orbit.monitor.sql;

/** Coluna do resultado: nome, tipo detectado e o nome do tipo no banco de origem. */
public record ResultColumn(String name, ColumnType type, String dbTypeName) {
}
