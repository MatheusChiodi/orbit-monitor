package io.orbit.probe.sql;

import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.LimitWrapper;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.SelectValidator;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.Statement;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-11 SQL parameters bound on execution")
class SqlProbeParametersTest {

    private final SqlProbe probe = new SqlProbe(new SelectValidator(), new LimitWrapper());
    private JdbcDataSource dataSource;

    @BeforeEach
    void setUp() throws Exception {
        dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE orders (id INT, store VARCHAR(10))");
            st.execute("INSERT INTO orders VALUES (1, 'SP'), (2, 'SP'), (3, 'RJ')");
        }
    }

    @Test
    @DisplayName("values are bound, so a quote cannot change the query")
    void bound() {
        ResultPayload sp = probe.execute(dataSource, Dialect.H2, "SELECT COUNT(*) AS QTY FROM orders WHERE store = :store",
                Map.of("store", "SP"), SqlProbeOptions.defaults());
        ResultPayload injection = probe.execute(dataSource, Dialect.H2,
                "SELECT COUNT(*) AS QTY FROM orders WHERE store = :store", Map.of("store", "x' OR '1'='1"),
                SqlProbeOptions.defaults());

        assertThat(((Number) sp.rows().getFirst().getFirst()).intValue()).isEqualTo(2);
        assertThat(((Number) injection.rows().getFirst().getFirst()).intValue()).isZero();
    }
}
