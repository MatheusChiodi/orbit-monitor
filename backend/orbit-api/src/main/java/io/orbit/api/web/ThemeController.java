package io.orbit.api.web;

import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.theme.ThemeStore;
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

/**
 * BE-40: custom themes ({@code orbit.themes.json}) for the theme editor and gallery. Anyone may read;
 * editors create, replace and delete. Unreadable themes are refused with 422 and the failing pairs.
 */
@RestController
@RequestMapping("/api/themes")
public class ThemeController {

    private final ThemeStore themes;
    private final AuditLog audit;

    public ThemeController(ThemeStore themes, AuditLog audit) {
        this.themes = themes;
        this.audit = audit;
    }

    @GetMapping
    public ConfigPayload<ThemeStore.CustomTheme> list() {
        return ConfigPayload.of(themes.list());
    }

    @GetMapping("/{id}")
    public ThemeStore.CustomTheme get(@PathVariable String id) {
        return themes.find(id).orElseThrow(() -> new NotFoundException("Theme", id));
    }

    /** Creates a theme; the id comes from the body and must be new. */
    @PostMapping
    public ResponseEntity<ThemeStore.CustomTheme> create(@RequestBody ThemeStore.CustomTheme body,
                                                         @RequestHeader(value = Operators.HEADER, required = false)
                                                         String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        if (body.id() != null && themes.find(body.id()).isPresent()) {
            throw new IllegalStateException("Theme already exists: " + body.id());
        }
        ThemeStore.CustomTheme saved = themes.save(body, operator);
        audit.record(operator, "theme.create", saved.id(), saved.name(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ThemeStore.CustomTheme save(@PathVariable String id, @RequestBody ThemeStore.CustomTheme body,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        String operator = Operators.require(header, null);
        ThemeStore.CustomTheme saved = themes.save(new ThemeStore.CustomTheme(id, body.name(), body.mode(),
                body.category(), body.colors(), body.chart(), body.syntax(), body.fx(), body.basedOn(), null, null),
                operator);
        audit.record(operator, "theme.save", id, saved.name(), request.getRemoteAddr());
        return saved;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id,
                                       @RequestHeader(value = Operators.HEADER, required = false) String header,
                                       HttpServletRequest request) {
        String operator = Operators.require(header, null);
        if (!themes.delete(id)) {
            throw new NotFoundException("Theme", id);
        }
        audit.record(operator, "theme.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
