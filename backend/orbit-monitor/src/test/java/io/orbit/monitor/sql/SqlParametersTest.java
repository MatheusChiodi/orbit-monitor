package io.orbit.monitor.sql;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-11 SQL parameters")
class SqlParametersTest {

    private static final String SQL =
            "SELECT COUNT(*) FROM orders WHERE created_at > SYSDATE - :days AND store = :store AND note <> ':ignored'";

    @Test
    @DisplayName("finds named parameters outside literals")
    void names() {
        assertThat(SqlParameters.names(SQL)).containsExactly("days", "store");
        assertThat(SqlParameters.names("SELECT 1 FROM dual -- :comment")).isEmpty();
    }

    @Test
    @DisplayName("binds values as JDBC parameters, never as SQL text")
    void binds() {
        SqlParameters.Bound bound = SqlParameters.bind(SQL, Map.of("days", 7, "store", "x' OR '1'='1"));

        assertThat(bound.sql()).contains("SYSDATE - ?", "store = ?", "':ignored'").doesNotContain("OR '1'='1");
        assertThat(bound.values()).containsExactly(7, "x' OR '1'='1");
    }

    @Test
    @DisplayName("a repeated name is bound at each position")
    void repeated() {
        assertThat(SqlParameters.bind("SELECT :a, :a FROM dual", Map.of("a", 1)).values()).isEqualTo(List.of(1, 1));
    }

    @Test
    @DisplayName("a missing value is rejected")
    void missingValue() {
        assertThatThrownBy(() -> SqlParameters.bind(SQL, Map.of("days", 7)))
                .isInstanceOf(UnsafeSqlException.class)
                .hasMessageContaining("store");
    }

    @Test
    @DisplayName("PostgreSQL casts (::int) are not parameters")
    void casts() {
        assertThat(SqlParameters.names("SELECT amount::int FROM t WHERE id = :id")).containsExactly("id");
    }
}
