package io.orbit.api.web;

import io.orbit.api.runtime.ConfigReloader;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.config.ConfigArchive;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.security.audit.AuditLog;
import io.orbit.security.settings.SettingsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * BE-37: export all {@code orbit.<feature>.json} files as one zip (encrypted secrets omitted) and
 * import one back. {@code dryRun=true} (the default) only returns the per-file diff.
 */
@RestController
public class ConfigTransferController {

    private final ConfigArchive archive;
    private final MonitorDefinitions definitions;
    private final MonitorRuntime runtime;
    private final SettingsService settings;
    private final AuditLog audit;
    private final ConfigReloader reloader;

    public ConfigTransferController(ConfigArchive archive, MonitorDefinitions definitions, MonitorRuntime runtime,
                                    SettingsService settings, AuditLog audit, ConfigReloader reloader) {
        this.reloader = reloader;
        this.archive = archive;
        this.definitions = definitions;
        this.runtime = runtime;
        this.settings = settings;
        this.audit = audit;
    }

    @GetMapping("/api/config/export")
    public ResponseEntity<byte[]> export() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"orbit-config.zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(archive.export());
    }

    @PostMapping(value = "/api/config/import", consumes = {"application/zip", MediaType.APPLICATION_OCTET_STREAM_VALUE})
    public List<ConfigArchive.FileChange> importArchive(@RequestBody byte[] body,
                                                        @RequestParam(defaultValue = "true") boolean dryRun,
                                                        HttpServletRequest request) {
        String operator = Actors.current();
        if (dryRun) {
            return archive.diff(body);
        }
        List<ConfigArchive.FileChange> changes = archive.apply(body);
        audit.record(operator, "config.import", null,
                changes.stream().map(ConfigArchive.FileChange::file).toList().toString(), request.getRemoteAddr());
        settings.reloadIfChanged();
        reloader.reloadChanged();
        if (definitions.reloadIfChanged()) {
            runtime.syncSchedule();
        }
        return changes;
    }
}
