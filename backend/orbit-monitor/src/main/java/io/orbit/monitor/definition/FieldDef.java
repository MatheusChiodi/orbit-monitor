package io.orbit.monitor.definition;

/**
 * "Data and display" choice for one result field: label, format, unit, whether it is kept as a
 * series and how it is displayed. Only selected fields are ever stored.
 *
 * @param key        column name (SQL) or JSON path / placeholder (HTTP)
 * @param format     integer, decimal, currency, percent, duration, relative-date or text
 * @param display    number, gauge, indicators, line, bars, table, text, semaphore or hidden
 * @param masked     CORE-16: shown masked; card fields are always masked (null = masked when sensitive)
 * @param showOnWall CORE-16: shown on the wall; never for personal or card data (null = false)
 */
public record FieldDef(String key, String label, String format, String unit, Integer decimals, boolean series,
                       String display, Boolean masked, Boolean showOnWall) {

    public FieldDef(String key, String label, String format, String unit, Integer decimals, boolean series,
                    String display) {
        this(key, label, format, unit, decimals, series, display, null, null);
    }

    @Override
    public Boolean showOnWall() {
        return Boolean.TRUE.equals(showOnWall);
    }
}
