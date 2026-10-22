package io.orbit.api.web;

import io.orbit.api.runtime.ConnectionPools;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.QueryCatalog;
import io.orbit.probe.sql.CatalogIntrospector;
import io.orbit.security.audit.AuditLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * SQL editor support: table/column catalog of a connection (BE-13, names and types only, never rows)
 * and the saved query catalog (BE-12, orbit.query-catalog.json).
 */
@RestController
public class SqlCatalogController {

    /** @param columns column names (autocomplete); {@code columnTypes} holds their JDBC types in the same order */
    public record TableView(String schema, String name, List<String> columns, List<String> columnTypes) {
    }

    public record CatalogView(String connectionId, List<TableView> tables) {
    }

    /** Body of PUT /api/query-catalog/{id}. */
    public record SavedQueryRequest(String name, String connectionId, String sql, String owner, String description) {
    }

    private final MonitorDefinitions definitions;
    private final ConnectionPools pools;
    private final CatalogIntrospector introspector;
    private final QueryCatalog catalog;
    private final AuditLog audit;

    public SqlCatalogController(MonitorDefinitions definitions, ConnectionPools pools,
                                CatalogIntrospector introspector, QueryCatalog catalog, AuditLog audit) {
        this.definitions = definitions;
        this.pools = pools;
        this.introspector = introspector;
        this.catalog = catalog;
        this.audit = audit;
    }

    /** {@code refresh=true} skips the 10-minute cache. */
    @GetMapping("/api/connections/{id}/catalog")
    public CatalogView catalog(@PathVariable String id, @RequestParam(defaultValue = "false") boolean refresh) {
        ConnectionDef connection = definitions.connection(id).orElseThrow(() -> new NotFoundException("Connection", id));
        if (refresh) {
            introspector.invalidate(id);
        }
        List<TableView> tables = introspector.tables(id, pools.dataSource(connection)).stream()
                .map(t -> new TableView(t.schema(), t.name(),
                        t.columns().stream().map(CatalogIntrospector.ColumnInfo::name).toList(),
                        t.columns().stream().map(CatalogIntrospector.ColumnInfo::type).toList()))
                .toList();
        return new CatalogView(id, tables);
    }

    @GetMapping("/api/query-catalog")
    public List<QueryCatalog.SavedQuery> savedQueries(@RequestParam(required = false) String connectionId) {
        catalog.reloadIfChanged();
        return connectionId == null || connectionId.isBlank() ? catalog.all() : catalog.byConnection(connectionId);
    }

    @GetMapping("/api/query-catalog/{id}")
    public QueryCatalog.SavedQuery savedQuery(@PathVariable String id) {
        catalog.reloadIfChanged();
        return catalog.find(id).orElseThrow(() -> new NotFoundException("Saved query", id));
    }

    @PutMapping("/api/query-catalog/{id}")
    public QueryCatalog.SavedQuery save(@PathVariable String id, @RequestBody SavedQueryRequest body,
                                        @RequestHeader(value = Operators.HEADER, required = false) String header,
                                        HttpServletRequest request) {
        String operator = Operators.require(header, null);
        QueryCatalog.SavedQuery saved = catalog.save(new QueryCatalog.SavedQuery(id, body.name(), body.connectionId(),
                body.sql(), body.owner(), body.description(), null, null), operator);
        audit.record(operator, "query-catalog.save", id, saved.sql(), request.getRemoteAddr());
        return saved;
    }

    @DeleteMapping("/api/query-catalog/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        String operator = Operators.require(header, null);
        if (!catalog.delete(id)) {
            throw new NotFoundException("Saved query", id);
        }
        audit.record(operator, "query-catalog.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
