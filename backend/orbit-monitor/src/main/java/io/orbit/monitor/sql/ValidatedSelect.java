package io.orbit.monitor.sql;

/** SELECT approved by {@link SelectValidator}, without a trailing ';'. Only this can be executed. */
public record ValidatedSelect(String sql) {
}
