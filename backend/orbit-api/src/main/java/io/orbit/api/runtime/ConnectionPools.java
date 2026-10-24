package io.orbit.api.runtime;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.security.vault.SecretResolver;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * One small read-only HikariCP pool per target connection (max 1-3), so a monitor never exhausts
 * the database it watches. A pool is rebuilt when its definition changes (e.g. password rotation).
 */
public class ConnectionPools implements AutoCloseable {

    private record Pool(ConnectionDef definition, HikariDataSource dataSource) {
    }

    private final SecretResolver secrets;
    private final Map<String, Pool> pools = new ConcurrentHashMap<>();

    public ConnectionPools(SecretResolver secrets) {
        this.secrets = secrets;
    }

    public DataSource dataSource(ConnectionDef connection) {
        Pool pool = pools.compute(connection.id(), (id, current) -> {
            if (current != null && sameTarget(current.definition(), connection)) {
                return current;
            }
            if (current != null) {
                current.dataSource().close();
            }
            return new Pool(connection, create(connection));
        });
        return pool.dataSource();
    }

    /**
     * BE-57: opens one connection to a draft target that is not saved (no pooled state kept) and closes it.
     * The plain password lives only for this call.
     */
    public boolean testOnce(String jdbcUrl, String username, String password) throws SQLException {
        HikariConfig config = new HikariConfig();
        config.setPoolName("orbit-draft-test");
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(1);
        config.setMinimumIdle(0);
        config.setReadOnly(true);
        config.setConnectionTimeout(10_000);
        config.setInitializationFailTimeout(-1);
        try (HikariDataSource dataSource = new HikariDataSource(config);
             Connection connection = dataSource.getConnection()) {
            return connection.isValid(5);
        }
    }

    public void evict(String connectionId) {
        Pool pool = pools.remove(connectionId);
        if (pool != null) {
            pool.dataSource().close();
        }
    }

    public int size() {
        return pools.size();
    }

    @Override
    public void close() {
        pools.keySet().forEach(this::evict);
    }

    private HikariDataSource create(ConnectionDef connection) {
        HikariConfig config = new HikariConfig();
        config.setPoolName("orbit-" + connection.id());
        config.setJdbcUrl(connection.jdbcUrl());
        config.setUsername(connection.username());
        if (connection.password() != null) {
            config.setPassword(secrets.resolve(connection.password()));
        }
        config.setMaximumPoolSize(Math.max(1, Math.min(3, connection.poolSize())));
        config.setMinimumIdle(0);
        config.setReadOnly(true);
        config.setConnectionTimeout(10_000);
        config.setIdleTimeout(120_000);
        config.setInitializationFailTimeout(-1);
        return new HikariDataSource(config);
    }

    private static boolean sameTarget(ConnectionDef a, ConnectionDef b) {
        return Objects.equals(a.jdbcUrl(), b.jdbcUrl()) && Objects.equals(a.username(), b.username())
                && Objects.equals(a.password(), b.password()) && a.poolSize() == b.poolSize();
    }
}
