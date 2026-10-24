package io.orbit.api.web;

import io.orbit.api.runtime.ConnectionPools;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.MonitorDef;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

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

    /** @param usedBy BE-57: number of SELECT monitors reading from this connection */
    public record ConnectionView(String id, String name, String kind, String jdbcUrl, String username, String password,
                                 int poolSize, Instant updatedAt, String updatedBy, int usedBy) {
    }

    /** BE-57: an unsaved connection to test; with {@code id} of a saved one and no password, its password is used. */
    public record DraftRequest(String id, String name, String jdbcUrl, String username, String password,
                               String passwordEnv) {
    }

    /** A monitor listed in the 409 answer to deleting a connection in use. */
    public record User(String id, String name) {
    }

    public record TestResult(boolean ok, long ms, String error) {
    }

    private final MonitorDefinitions definitions;
    private final MonitorRuntime runtime;
    private final SecretResolver secrets;
    private final ConnectionPools pools;
    private final AuditLog audit;
    private final CatalogIntrospector catalog;
    private final SensitiveDataRedactor redactor;

    public ConnectionController(MonitorDefinitions definitions, SecretResolver secrets, ConnectionPools pools,
                                AuditLog audit, CatalogIntrospector catalog, SensitiveDataRedactor redactor,
                                MonitorRuntime runtime) {
        this.catalog = catalog;
        this.redactor = redactor;
        this.runtime = runtime;
        this.definitions = definitions;
        this.secrets = secrets;
        this.pools = pools;
        this.audit = audit;
    }

    @GetMapping
    public List<ConnectionView> list() {
        return definitions.connections().stream().map(this::view).toList();
    }

    @PutMapping("/{id}")
    public ConnectionView save(@PathVariable String id, @RequestBody ConnectionRequest body,
                               HttpServletRequest request) {
        String operator = Actors.current();
        SecretRef password = password(id, body);
        ConnectionDef saved = definitions.saveConnection(new ConnectionDef(id, body.name(), body.jdbcUrl(),
                body.username(), password, body.poolSize() == null ? 2 : body.poolSize(), null, null), operator);
        pools.evict(id);
        catalog.invalidate(id);
        audit.record(operator, "connection.save", id, saved.jdbcUrl(), request.getRemoteAddr());
        return view(saved);
    }

    /**
     * BE-57: a connection read by SELECT monitors answers 409 {@code connection-in-use} listing them;
     * {@code force=true} deletes it anyway and pauses those monitors.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestParam(defaultValue = "false") boolean force,
                                       HttpServletRequest request) {
        String operator = Actors.current();
        if (definitions.connection(id).isEmpty()) {
            throw new NotFoundException("Connection", id);
        }
        List<String> users = definitions.connectionUsers(id);
        if (!users.isEmpty() && !force) {
            List<User> listed = users.stream()
                    .map(u -> new User(u, definitions.monitor(u).map(MonitorDef::name).orElse(u))).toList();
            throw new ConflictException("connection-in-use", "Connection " + id + " is used by " + users.size()
                    + " monitors", Map.of("usedBy", listed), users.size());
        }
        definitions.deleteConnection(id, force, operator);
        pools.evict(id);
        catalog.invalidate(id);
        audit.record(operator, "connection.delete", id, users.isEmpty() ? null
                : "forced, paused: " + String.join(", ", users), request.getRemoteAddr());
        if (!users.isEmpty()) {
            runtime.syncSchedule();
        }
        return ResponseEntity.noContent().build();
    }

    /** BE-57: tests a connection that is not saved; nothing is stored and the password is never returned. */
    @PostMapping("/test")
    public TestResult testDraft(@RequestBody DraftRequest body, HttpServletRequest request) {
        if (body.jdbcUrl() == null || body.jdbcUrl().isBlank()) {
            throw new IllegalArgumentException("jdbcUrl is required");
        }
        Dialect.fromJdbcUrl(body.jdbcUrl());
        String password = draftPassword(body);
        audit.record(Actors.current(), "connection.test", body.id() == null ? "draft" : body.id(), body.jdbcUrl(),
                request.getRemoteAddr());
        long start = System.nanoTime();
        try {
            boolean valid = pools.testOnce(body.jdbcUrl(), body.username(), password);
            return new TestResult(valid, elapsed(start), valid ? null : "Connection not valid");
        } catch (SQLException | RuntimeException e) {
            return new TestResult(false, elapsed(start), failure(e, password));
        }
    }

    @PostMapping("/{id}/test")
    public TestResult test(@PathVariable String id) {
        ConnectionDef connection = definitions.connection(id).orElseThrow(() -> new NotFoundException("Connection", id));
        long start = System.nanoTime();
        try (Connection c = pools.dataSource(connection).getConnection()) {
            boolean valid = c.isValid(5);
            return new TestResult(valid, (System.nanoTime() - start) / 1_000_000, valid ? null : "Connection not valid");
        } catch (SQLException e) {
            return new TestResult(false, elapsed(start), failure(e, null));
        }
    }

    private String draftPassword(DraftRequest body) {
        if (body.passwordEnv() != null && !body.passwordEnv().isBlank()) {
            return secrets.resolve(SecretRef.env(body.passwordEnv()));
        }
        if (body.password() != null && !body.password().isEmpty()) {
            return body.password();
        }
        return body.id() == null ? null : definitions.connection(body.id()).map(ConnectionDef::password)
                .map(secrets::resolve).orElse(null);
    }

    /** The driver's message, masked and never carrying the typed password. */
    private String failure(Exception e, String password) {
        String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
        if (password != null && !password.isEmpty()) {
            message = message.replace(password, "****");
        }
        return "Connection failed: " + redactor.redactText(message);
    }

    private static long elapsed(long start) {
        return (System.nanoTime() - start) / 1_000_000;
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

    private ConnectionView view(ConnectionDef c) {
        String kind;
        try {
            kind = Dialect.fromJdbcUrl(c.jdbcUrl()).name();
        } catch (IllegalArgumentException e) {
            kind = "UNKNOWN";
        }
        return new ConnectionView(c.id(), c.name(), kind, c.jdbcUrl(), c.username(),
                c.password() == null ? null : c.password().masked(), c.poolSize(), c.updatedAt(), c.updatedBy(),
                definitions.connectionUsers(c.id()).size());
    }
}
