package io.orbit.api.web;

import io.orbit.security.audit.AuditLog;
import io.orbit.security.settings.SettingsService;
import io.orbit.security.settings.WorkspaceDefaults;
import io.orbit.workspace.customization.CustomizationService;
import io.orbit.workspace.customization.TerminologyService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * BE-58: "Reset workspace" in Settings. Restores the workspace defaults (theme, animation, density,
 * locale, scale), the workspace customization scope and the custom terminology. Monitors, groups,
 * connections, layouts, themes, profiles and the access policy are never touched.
 */
@RestController
public class WorkspaceResetController {

    /** @param reset what went back to the built-in values */
    public record ResetResult(List<String> reset) {
    }

    private static final List<String> PARTS = List.of("defaults", "customization", "terminology");

    private final SettingsService settings;
    private final CustomizationService customization;
    private final TerminologyService terminology;
    private final AuditLog audit;

    public WorkspaceResetController(SettingsService settings, CustomizationService customization,
                                    TerminologyService terminology, AuditLog audit) {
        this.settings = settings;
        this.customization = customization;
        this.terminology = terminology;
        this.audit = audit;
    }

    @PostMapping("/api/workspace/reset")
    public ResetResult reset(HttpServletRequest request) {
        String operator = Actors.current();
        settings.saveDefaults(new WorkspaceDefaults(null, null, null, null, null), operator);
        customization.delete("workspace", null);
        TerminologyService.LOCALES.forEach(terminology::delete);
        audit.record(operator, "workspace.reset", null, String.join(", ", PARTS), request.getRemoteAddr());
        return new ResetResult(PARTS);
    }
}
