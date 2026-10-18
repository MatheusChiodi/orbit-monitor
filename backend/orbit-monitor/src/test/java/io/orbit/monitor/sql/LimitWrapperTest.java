package io.orbit.monitor.sql;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LimitWrapperTest {

    private final LimitWrapper wrapper = new LimitWrapper();
    private static final String SQL = "SELECT id FROM t ORDER BY id";

    @Test
    void oracleUsesRownum() {
        assertThat(wrapper.wrap(SQL, Dialect.ORACLE, 100))
                .isEqualTo("SELECT * FROM (SELECT id FROM t ORDER BY id) WHERE ROWNUM <= 100");
    }

    @Test
    void postgresMysqlAndH2UseLimit() {
        String expected = "SELECT * FROM (SELECT id FROM t ORDER BY id) orbit_q LIMIT 50";
        assertThat(wrapper.wrap(SQL, Dialect.POSTGRES, 50)).isEqualTo(expected);
        assertThat(wrapper.wrap(SQL, Dialect.MYSQL, 50)).isEqualTo(expected);
        assertThat(wrapper.wrap(SQL, Dialect.H2, 50)).isEqualTo(expected);
    }

    @Test
    void sqlServerUsesTop() {
        assertThat(wrapper.wrap("SELECT id FROM t", Dialect.SQLSERVER, 10))
                .isEqualTo("SELECT TOP (10) * FROM (SELECT id FROM t) orbit_q");
    }

    @Test
    void sqlServerDoesNotWrapCteBecauseItCannotBeADerivedTable() {
        String cte = "WITH x AS (SELECT 1 a) SELECT a FROM x";
        assertThat(wrapper.wrap(cte, Dialect.SQLSERVER, 10)).isEqualTo(cte);
    }

    @Test
    void limitMustBePositive() {
        assertThatThrownBy(() -> wrapper.wrap(SQL, Dialect.ORACLE, 0)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void dialectFromJdbcUrl() {
        assertThat(Dialect.fromJdbcUrl("jdbc:oracle:thin:@host:1521/XE")).isEqualTo(Dialect.ORACLE);
        assertThat(Dialect.fromJdbcUrl("jdbc:postgresql://h/db")).isEqualTo(Dialect.POSTGRES);
        assertThat(Dialect.fromJdbcUrl("jdbc:sqlserver://h;databaseName=x")).isEqualTo(Dialect.SQLSERVER);
        assertThat(Dialect.fromJdbcUrl("jdbc:mysql://h/db")).isEqualTo(Dialect.MYSQL);
        assertThat(Dialect.fromJdbcUrl("jdbc:mariadb://h/db")).isEqualTo(Dialect.MYSQL);
        assertThat(Dialect.fromJdbcUrl("jdbc:h2:mem:x")).isEqualTo(Dialect.H2);
        assertThatThrownBy(() -> Dialect.fromJdbcUrl("jdbc:db2://x")).isInstanceOf(IllegalArgumentException.class);
    }
}
