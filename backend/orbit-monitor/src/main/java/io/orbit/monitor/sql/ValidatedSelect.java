package io.orbit.monitor.sql;

/** SELECT aprovado pelo {@link SelectValidator}, já sem ';' final. Só ele pode ser executado. */
public record ValidatedSelect(String sql) {
}
