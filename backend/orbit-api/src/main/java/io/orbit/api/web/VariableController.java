package io.orbit.api.web;

import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.variable.VariableService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
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

import java.util.Locale;

/**
 * BE-39: workspace variables ({@code orbit.variables.json}). Vault values are sealed on save and never
 * returned ({@code •••• (vault)}); the audit records the name and kind, never a value.
 */
@RestController
@RequestMapping("/api/variables")
public class VariableController {

    /**
     * @param kind  {@code var} (default) or {@code vault}
     * @param value plain value, or for {@code vault} the secret / {@code ${env:NAME}}; null keeps the secret
     */
    public record VariableRequest(String id, String name, String kind, String value, String description) {
    }

    private final VariableService variables;
    private final AuditLog audit;

    public VariableController(VariableService variables, AuditLog audit) {
        this.variables = variables;
        this.audit = audit;
    }

    @GetMapping
    public ConfigPayload<VariableService.View> list() {
        return ConfigPayload.of(variables.list());
    }

    @GetMapping("/{id}")
    public VariableService.View get(@PathVariable String id) {
        return variables.find(id).orElseThrow(() -> new NotFoundException("Variable", id));
    }

    /** Creates a variable; without an id one is derived from the name ({@code var_<name>}). */
    @PostMapping
    public ResponseEntity<VariableService.View> create(@RequestBody VariableRequest body,
                                                       @RequestHeader(value = Operators.HEADER, required = false)
                                                       String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        String id = body.id() != null && !body.id().isBlank() ? body.id() : idFrom(body.name());
        if (variables.find(id).isPresent()) {
            throw new IllegalStateException("Variable already exists: " + id);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(save(id, body, operator, request));
    }

    @PutMapping("/{id}")
    public VariableService.View update(@PathVariable String id, @RequestBody VariableRequest body,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        return save(id, body, Operators.require(header, null), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        String operator = Operators.require(header, null);
        if (!variables.delete(id)) {
            throw new NotFoundException("Variable", id);
        }
        audit.record(operator, "variable.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private VariableService.View save(String id, VariableRequest body, String operator, HttpServletRequest request) {
        VariableService.View saved = variables.save(new VariableService.Input(id, body.name(), kind(body.kind()),
                body.value(), body.description()), operator);
        audit.record(operator, "variable.save", id, saved.name() + " (" + saved.kind() + ")", request.getRemoteAddr());
        return saved;
    }

    private static VariableService.Kind kind(String kind) {
        if (kind == null || kind.isBlank()) {
            return VariableService.Kind.VAR;
        }
        try {
            return VariableService.Kind.valueOf(kind.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("kind must be var or vault");
        }
    }

    private static String idFrom(String name) {
        String slug = name == null ? "" : name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]", "_");
        return "var_" + (slug.isEmpty() ? "unnamed" : slug);
    }
}
