package io.orbit.probe.sql;

import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@DisplayName("BE-13 catalog introspection")
class CatalogIntrospectorTest {

    private DataSource dataSource;
    private final CatalogIntrospector introspector = new CatalogIntrospector(Clock.systemUTC(), Duration.ofMinutes(10), 500);

    @BeforeEach
    void setUp() throws Exception {
        JdbcDataSource ds = new JdbcDataSource();
        ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        try (Connection c = ds.getConnection(); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE reconciliation (id INT, status VARCHAR(10), created_at TIMESTAMP)");
        }
        dataSource = spy(ds);
    }

    @Test
    @DisplayName("lists user tables with their columns and types, without system schemas")
    void listsTables() {
        var tables = introspector.tables("con_h2", dataSource);

        assertThat(tables).extracting(CatalogIntrospector.TableInfo::name).contains("RECONCILIATION");
        assertThat(tables).noneMatch(t -> "INFORMATION_SCHEMA".equals(t.schema()));
        var table = tables.stream().filter(t -> t.name().equals("RECONCILIATION")).findFirst().orElseThrow();
        assertThat(table.columns()).extracting(CatalogIntrospector.ColumnInfo::name)
                .containsExactly("ID", "STATUS", "CREATED_AT");
    }

    @Test
    @DisplayName("results are cached per connection until invalidated")
    void caches() throws Exception {
        introspector.tables("con_h2", dataSource);
        introspector.tables("con_h2", dataSource);
        verify(dataSource, times(1)).getConnection();

        introspector.invalidate("con_h2");
        introspector.tables("con_h2", dataSource);
        verify(dataSource, times(2)).getConnection();
    }
}
