package io.orbit.monitor.sql;

/** Read modes for a SELECT result (features spec, section 2.2). */
public enum ReadMode {
    SINGLE_VALUE,
    INDICATOR_CARD,
    RANKING,
    TIME_SERIES,
    TABLE,
    ROW_COUNT
}
