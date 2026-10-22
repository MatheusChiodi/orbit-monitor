package io.orbit.probe.sql;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BE-13: tables and columns read from JDBC metadata for editor autocomplete, cached per connection.
 * Only metadata is read (names and types, never rows), on a read-only connection.
 */
public class CatalogIntrospector {

    private static final String[] TABLE_TYPES = {"TABLE", "VIEW"};
    private static final Set<String> SYSTEM_SCHEMAS = Set.of(
            "information_schema", "pg_catalog", "pg_toast", "mysql", "performance_schema", "sys",
            "system", "ctxsys", "mdsys", "olapsys", "outln", "xdb", "wmsys", "dbsnmp", "appqossys",
            "audsys", "gsmadmin_internal", "lbacsys", "ojvmsys", "dvsys", "orddata", "ordsys",
            "db_accessadmin", "db_backupoperator", "db_datareader", "db_datawriter", "db_ddladmin",
            "db_denydatareader", "db_denydatawriter", "db_owner", "db_securityadmin", "guest");

    public record ColumnInfo(String name, String type) {
    }

    public record TableInfo(String schema, String name, List<ColumnInfo> columns) {
    }

    private record Entry(List<TableInfo> tables, Instant expiresAt) {
    }

    private record TableKey(String schema, String name) {
    }

    private final Clock clock;
    private final Duration cacheTtl;
    private final int maxTables;
    private final Map<String, Entry> cache = new ConcurrentHashMap<>();

    public CatalogIntrospector(Clock clock, Duration cacheTtl, int maxTables) {
        if (maxTables <= 0) {
            throw new IllegalArgumentException("maxTables must be positive");
        }
        this.clock = Objects.requireNonNull(clock, "clock");
        this.cacheTtl = Objects.requireNonNull(cacheTtl, "cacheTtl");
        this.maxTables = maxTables;
    }

    /** Cached for {@code cacheTtl}; system schemas are left out. */
    public List<TableInfo> tables(String connectionId, DataSource dataSource) {
        Entry entry = cache.compute(connectionId, (id, current) -> {
            Instant now = clock.instant();
            if (current != null && now.isBefore(current.expiresAt())) {
                return current;
            }
            return new Entry(read(dataSource), now.plus(cacheTtl));
        });
        return entry.tables();
    }

    public void invalidate(String connectionId) {
        cache.remove(connectionId);
    }

    private List<TableInfo> read(DataSource dataSource) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setReadOnly(true);
            DatabaseMetaData meta = connection.getMetaData();
            Map<TableKey, List<ColumnInfo>> tables = listTables(meta);
            readColumns(meta, tables);
            List<TableInfo> result = new ArrayList<>(tables.size());
            tables.forEach((key, columns) -> result.add(new TableInfo(key.schema(), key.name(), List.copyOf(columns))));
            return List.copyOf(result);
        } catch (SQLException e) {
            throw new SqlProbeException("Could not read the catalog: " + e.getMessage(), false, e);
        }
    }

    private Map<TableKey, List<ColumnInfo>> listTables(DatabaseMetaData meta) throws SQLException {
        Map<TableKey, List<ColumnInfo>> tables = new LinkedHashMap<>();
        try (ResultSet rs = meta.getTables(null, null, "%", TABLE_TYPES)) {
            while (rs.next() && tables.size() < maxTables) {
                String schema = rs.getString("TABLE_SCHEM");
                if (!isSystemSchema(schema)) {
                    tables.put(new TableKey(schema, rs.getString("TABLE_NAME")), new ArrayList<>());
                }
            }
        }
        return tables;
    }

    /** One metadata call for every column, ordered by position within each table. */
    private static void readColumns(DatabaseMetaData meta, Map<TableKey, List<ColumnInfo>> tables) throws SQLException {
        Map<TableKey, TreeMap<Integer, ColumnInfo>> ordered = new LinkedHashMap<>();
        try (ResultSet rs = meta.getColumns(null, null, "%", "%")) {
            while (rs.next()) {
                TableKey key = new TableKey(rs.getString("TABLE_SCHEM"), rs.getString("TABLE_NAME"));
                if (tables.containsKey(key)) {
                    ordered.computeIfAbsent(key, k -> new TreeMap<>()).put(rs.getInt("ORDINAL_POSITION"),
                            new ColumnInfo(rs.getString("COLUMN_NAME"), rs.getString("TYPE_NAME")));
                }
            }
        }
        ordered.forEach((key, columns) -> tables.get(key).addAll(columns.values()));
    }

    private static boolean isSystemSchema(String schema) {
        return schema != null && SYSTEM_SCHEMAS.contains(schema.toLowerCase(Locale.ROOT));
    }
}
