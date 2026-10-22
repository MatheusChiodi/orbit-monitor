package io.orbit.api.web;

import io.orbit.security.audit.AuditLog;
import io.orbit.security.settings.OrbitSettings;
import io.orbit.security.settings.SettingsService;
import io.orbit.security.settings.WorkspaceDefaults;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * orbit.settings.json: access policy (who may edit), workspace defaults (BE-40: theme, animation level,
 * density, locale, viewing distance scale) and history window. Reads are open; changes need an editor.
 */
@RestController
public class SettingsController {

    private final SettingsService settings;
    private final AuditLog audit;

    public SettingsController(SettingsService settings, AuditLog audit) {
        this.settings = settings;
        this.audit = audit;
    }

    @GetMapping("/api/settings")
    public OrbitSettings get() {
        return settings.current();
    }

    @PutMapping("/api/settings")
    public OrbitSettings save(@RequestBody OrbitSettings body,
                              @RequestHeader(value = Operators.HEADER, required = false) String header,
                              HttpServletRequest request) {
        String operator = Operators.require(header, null);
        OrbitSettings saved = settings.save(body, operator);
        String access = saved.access() == null ? "default" : saved.access().editFrom();
        audit.record(operator, "settings.save", OrbitSettings.ID, "editFrom=" + access, request.getRemoteAddr());
        return saved;
    }

    /** BE-40: effective workspace defaults, the same shape as the frontend {@code WorkspacePreferenceDefaults}. */
    @GetMapping("/api/settings/defaults")
    public WorkspaceDefaults defaults() {
        return settings.defaults();
    }

    /** BE-40: replaces the workspace defaults; null fields go back to the built-in value. */
    @PutMapping("/api/settings/defaults")
    public WorkspaceDefaults saveDefaults(@RequestBody WorkspaceDefaults body,
                                          @RequestHeader(value = Operators.HEADER, required = false) String header,
                                          HttpServletRequest request) {
        String operator = Operators.require(header, null);
        WorkspaceDefaults saved = settings.saveDefaults(body, operator);
        audit.record(operator, "settings.defaults", OrbitSettings.ID, "theme=" + saved.theme() + " animation="
                + saved.animation() + " density=" + saved.density() + " locale=" + saved.locale() + " scale="
                + saved.scale(), request.getRemoteAddr());
        return saved;
    }
}
