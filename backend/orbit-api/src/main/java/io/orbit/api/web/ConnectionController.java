package io.orbit.api.web;

import io.orbit.api.runtime.ConnectionPools;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.sql.Dialect;
import io.orbit.probe.sql.CatalogIntrospector;
import io.orbit.security.audit.AuditLog;
import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;

/** Target database connections (orbit.connections.json); passwords are write-only. */
@RestController
@RequestMapping("/api/connections")
public class ConnectionController {

    /**
     * @param password    typed password, sealed into the vault; omit on update to keep the current one
     * @param passwordEnv alternative: name of an environment variable holding the password
     */
    public record ConnectionRequest(String name, String jdbcUrl, String username, String password,
                                    String passwordEnv, Integer poolSize) {
    }

    public record ConnectionView(String id, String name, String kind, String jdbcUrl, String username, String password,
                                 int poolSize, Instant updatedAt, String updatedBy) {
    }

    public record TestResult(boolean ok, long ms, String error) {
    }

    private final MonitorDefinitions definitions;
    private final SecretResolver secrets;
    private final ConnectionPools pools;
    private final AuditLog audit;
    private final CatalogIntrospector catalog;

    public ConnectionController(MonitorDefinitions definitions, SecretResolver secrets, ConnectionPools pools,
                                AuditLog audit, CatalogIntrospector catalog) {
        this.catalog = catalog;
        this.definitions = definitions;
        this.secrets = secrets;
        this.pools = pools;
        this.audit = audit;
    }

    @GetMapping
    public List<ConnectionView> list() {
        return definitions.connections().stream().map(ConnectionController::view).toList();
    }

    @PutMapping("/{id}")
    public ConnectionView save(@PathVariable String id, @RequestBody ConnectionRequest body,
                               @RequestHeader(value = Operators.HEADER, required = false) String header,
                               HttpServletRequest request) {
        String operator = Operators.require(header, null);
        SecretRef password = password(id, body);
        ConnectionDef saved = definitions.saveConnection(new ConnectionDef(id, body.name(), body.jdbcUrl(),
                body.username(), password, body.poolSize() == null ? 2 : body.poolSize(), null, null), operator);
        pools.evict(id);
        catalog.invalidate(id);
        audit.record(operator, "connection.save", id, saved.jdbcUrl(), request.getRemoteAddr());
        return view(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        String operator = Operators.require(header, null);
        if (!definitions.deleteConnection(id)) {
            throw new NotFoundException("Connection", id);
        }
        pools.evict(id);
        catalog.invalidate(id);
        audit.record(operator, "connection.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/test")
    public TestResult test(@PathVariable String id) {
        ConnectionDef connection = definitions.connection(id).orElseThrow(() -> new NotFoundException("Connection", id));
        long start = System.nanoTime();
        try (Connection c = pools.dataSource(connection).getConnection()) {
            boolean valid = c.isValid(5);
            return new TestResult(valid, (System.nanoTime() - start) / 1_000_000, valid ? null : "Connection not valid");
        } catch (SQLException e) {
            return new TestResult(false, (System.nanoTime() - start) / 1_000_000, "Connection failed: " + e.getMessage());
        }
    }

    private SecretRef password(String id, ConnectionRequest body) {
        if (body.passwordEnv() != null && !body.passwordEnv().isBlank()) {
            return SecretRef.env(body.passwordEnv());
        }
        if (body.password() != null && !body.password().isEmpty()) {
            return secrets.seal(body.password());
        }
        return definitions.connection(id).map(ConnectionDef::password).orElse(null);
    }

    private static ConnectionView view(ConnectionDef c) {
        String kind;
        try {
            kind = Dialect.fromJdbcUrl(c.jdbcUrl()).name();
        } catch (IllegalArgumentException e) {
            kind = "UNKNOWN";
        }
        return new ConnectionView(c.id(), c.name(), kind, c.jdbcUrl(), c.username(),
                c.password() == null ? null : c.password().masked(), c.poolSize(), c.updatedAt(), c.updatedBy());
    }
}
