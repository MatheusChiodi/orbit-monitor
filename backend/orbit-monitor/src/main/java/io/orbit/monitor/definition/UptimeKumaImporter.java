package io.orbit.monitor.definition;

import java.util.List;

/**
 * BE-43: maps an Uptime Kuma backup (JSON export) to Orbit HTTP monitors and groups. Kuma's
 * notification secrets and passwords are never imported; unsupported monitor types are reported.
 */
public final class UptimeKumaImporter {

    public record ImportedGroup(String id, String name) {
    }

    /** @param skipped human-readable reasons for monitors that could not be mapped */
    public record Result(List<HttpMonitorDef> requests, List<ImportedGroup> groups, List<String> skipped) {
    }

    private UptimeKumaImporter() {
    }

    public static Result parse(String kumaBackupJson) {
        throw new UnsupportedOperationException("BE-43 Uptime Kuma import is not implemented yet");
    }
}
