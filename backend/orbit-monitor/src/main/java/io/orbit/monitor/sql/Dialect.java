package io.orbit.monitor.sql;

import java.util.Locale;

/** Dialetos dos bancos alvo suportados (H2 serve para testes e para o próprio Orbit local). */
public enum Dialect {
    ORACLE,
    POSTGRES,
    MYSQL,
    SQLSERVER,
    H2;

    public static Dialect fromJdbcUrl(String url) {
        String u = url.toLowerCase(Locale.ROOT);
        if (u.startsWith("jdbc:oracle:")) {
            return ORACLE;
        }
        if (u.startsWith("jdbc:postgresql:")) {
            return POSTGRES;
        }
        if (u.startsWith("jdbc:mysql:") || u.startsWith("jdbc:mariadb:")) {
            return MYSQL;
        }
        if (u.startsWith("jdbc:sqlserver:")) {
            return SQLSERVER;
        }
        if (u.startsWith("jdbc:h2:")) {
            return H2;
        }
        throw new IllegalArgumentException("Banco não suportado: " + url);
    }
}
