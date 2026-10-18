package io.orbit.monitor.sql;

/** Modos de leitura do resultado de um SELECT (seção 2.2 das funcionalidades). */
public enum ReadMode {
    SINGLE_VALUE,
    INDICATOR_CARD,
    RANKING,
    TIME_SERIES,
    TABLE,
    ROW_COUNT
}
