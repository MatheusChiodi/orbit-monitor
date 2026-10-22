package io.orbit.api.web;

import com.fasterxml.jackson.databind.JsonNode;
import io.orbit.security.audit.AuditLog;
import io.orbit.workspace.customization.CustomizationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * BE-51 / CORE-21: server-side customization scopes ({@code orbit.customization.json}). Anyone may read
 * (the wall needs its layout and instance settings); only editors change them (view-only clients never
 * customize, docs/07 section 7).
 */
@RestController
@RequestMapping("/api/customization")
public class CustomizationController {

    /** @param name required for profiles */
    public record ScopeRequest(String name, Map<String, JsonNode> values) {
    }

    /** Effective server-side values for a surface (workspace, then layout, then instance). */
    public record Resolved(String layout, String instance, Map<String, JsonNode> values) {
    }

    private final CustomizationService customization;
    private final AuditLog audit;

    public CustomizationController(CustomizationService customization, AuditLog audit) {
        this.customization = customization;
        this.audit = audit;
    }

    @GetMapping
    public ConfigPayload<CustomizationService.Entry> list() {
        return ConfigPayload.of(customization.list());
    }

    @GetMapping("/resolve")
    public Resolved resolve(@RequestParam(required = false) String layout,
                            @RequestParam(required = false) String instance) {
        return new Resolved(layout, instance, customization.resolve(layout, instance));
    }

    @GetMapping("/workspace")
    public CustomizationService.Entry workspace() {
        return customization.find("workspace", null).orElseThrow(() -> new NotFoundException("Customization",
                "workspace"));
    }

    @GetMapping("/{scope}/{target}")
    public CustomizationService.Entry get(@PathVariable String scope, @PathVariable String target) {
        return customization.find(scope, target).orElseThrow(() -> new NotFoundException("Customization",
                CustomizationService.idOf(scope, target)));
    }

    @PutMapping("/workspace")
    public CustomizationService.Entry saveWorkspace(@RequestBody ScopeRequest body,
                                                    @RequestHeader(value = Operators.HEADER, required = false)
                                                    String header, HttpServletRequest request) {
        return save("workspace", null, body, header, request);
    }

    @PutMapping("/{scope}/{target}")
    public CustomizationService.Entry saveScope(@PathVariable String scope, @PathVariable String target,
                                                @RequestBody ScopeRequest body,
                                                @RequestHeader(value = Operators.HEADER, required = false)
                                                String header, HttpServletRequest request) {
        if ("workspace".equals(scope)) {
            throw new IllegalArgumentException("The workspace scope has no target: use /api/customization/workspace");
        }
        return save(scope, target, body, header, request);
    }

    @DeleteMapping("/workspace")
    public ResponseEntity<Void> resetWorkspace(@RequestHeader(value = Operators.HEADER, required = false) String header,
                                               HttpServletRequest request) {
        return delete("workspace", null, header, request);
    }

    @DeleteMapping("/{scope}/{target}")
    public ResponseEntity<Void> resetScope(@PathVariable String scope, @PathVariable String target,
                                           @RequestHeader(value = Operators.HEADER, required = false) String header,
                                           HttpServletRequest request) {
        return delete(scope, target, header, request);
    }

    /** FE-57: a profile as a portable JSON file (no secrets, no workspace ids). */
    @GetMapping("/profiles/{id}/export")
    public ResponseEntity<CustomizationService.ProfileFile> export(@PathVariable String id) {
        CustomizationService.ProfileFile file = customization.exportProfile(id)
                .orElseThrow(() -> new NotFoundException("Profile", id));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"orbit-profile-" + id + ".json\"")
                .body(file);
    }

    @PostMapping("/profiles/{id}/import")
    public CustomizationService.Entry importProfile(@PathVariable String id,
                                                    @RequestBody CustomizationService.ProfileFile body,
                                                    @RequestHeader(value = Operators.HEADER, required = false)
                                                    String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        CustomizationService.Entry saved = customization.importProfile(id, body, operator);
        audit.record(operator, "customization.import", saved.id(), saved.values().size() + " settings",
                request.getRemoteAddr());
        return saved;
    }

    private CustomizationService.Entry save(String scope, String target, ScopeRequest body, String header,
                                            HttpServletRequest request) {
        String operator = Operators.require(header, null);
        CustomizationService.Entry saved = customization.save(scope, target, body.name(), body.values(), operator);
        audit.record(operator, "customization.save", saved.id(), saved.values().size() + " settings",
                request.getRemoteAddr());
        return saved;
    }

    private ResponseEntity<Void> delete(String scope, String target, String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        if (!customization.delete(scope, target)) {
            throw new NotFoundException("Customization", CustomizationService.idOf(scope, target));
        }
        audit.record(operator, "customization.reset", CustomizationService.idOf(scope, target), null,
                request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
