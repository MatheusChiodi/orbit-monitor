package io.orbit.probe.sql;

import javax.sql.DataSource;
import java.time.Clock;
import java.time.Duration;
import java.util.List;

/** BE-13: tables and columns read from JDBC metadata for editor autocomplete, cached per connection. */
public class CatalogIntrospector {

    public record ColumnInfo(String name, String type) {
    }

    public record TableInfo(String schema, String name, List<ColumnInfo> columns) {
    }

    public CatalogIntrospector(Clock clock, Duration cacheTtl, int maxTables) {
    }

    /** Cached for {@code cacheTtl}; system schemas are left out. */
    public List<TableInfo> tables(String connectionId, DataSource dataSource) {
        throw new UnsupportedOperationException("BE-13 catalog introspection is not implemented yet");
    }

    public void invalidate(String connectionId) {
        throw new UnsupportedOperationException("BE-13 catalog introspection is not implemented yet");
    }
}
