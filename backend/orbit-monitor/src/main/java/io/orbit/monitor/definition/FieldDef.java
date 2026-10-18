package io.orbit.monitor.definition;

/**
 * "Data and display" choice for one result field: label, format, unit, whether it is kept as a
 * series and how it is displayed. Only selected fields are ever stored.
 *
 * @param key     column name (SQL) or JSON path / placeholder (HTTP)
 * @param format  integer, decimal, currency, percent, duration, relative-date or text
 * @param display number, gauge, indicators, line, bars, table, text, semaphore or hidden
 */
public record FieldDef(String key, String label, String format, String unit, Integer decimals, boolean series,
                       String display) {
}
