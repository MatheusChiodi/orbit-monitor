package io.orbit.monitor.definition;

import java.util.Locale;
import java.util.UUID;

/**
 * BE-54: changes to one field of a monitor of any kind that keep every other setting (window, retry,
 * steps, OAuth, probe settings, sealed secrets). Copies never carry a push token: the caller issues a
 * new one so two monitors never share a URL.
 */
public final class MonitorEdits {

    private MonitorEdits() {
    }

    public static MonitorDef withGroup(MonitorDef def, String groupId) {
        return rebuild(def, def.id(), def.name(), groupId, def.paused(), true);
    }

    public static MonitorDef withPaused(MonitorDef def, boolean paused) {
        return rebuild(def, def.id(), def.name(), def.groupId(), paused, true);
    }

    /** An active copy with a new id and name; a push monitor's copy has no token yet. */
    public static MonitorDef copy(MonitorDef def, String id, String name) {
        return rebuild(def, id, name, def.groupId(), false, false);
    }

    /** A new id with the original's prefix ({@code req_}, {@code sel_}, {@code push_}...) and the copy's name. */
    public static String copyId(MonitorDef def) {
        int underscore = def.id().indexOf('_');
        String prefix = underscore > 0 ? def.id().substring(0, underscore + 1) : "mon_";
        String slug = (def.name() == null ? "monitor" : def.name()).toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "_").replaceAll("^_|_$", "");
        slug = slug.length() > 34 ? slug.substring(0, 34) : slug;
        return prefix + (slug.isEmpty() ? "monitor" : slug) + "_copy_" + UUID.randomUUID().toString().substring(0, 6);
    }

    private static MonitorDef rebuild(MonitorDef def, String id, String name, String groupId, boolean paused,
                                      boolean keepPushToken) {
        return switch (def) {
            case SqlMonitorDef s -> new SqlMonitorDef(id, name, groupId, s.connectionId(), s.sql(),
                    s.intervalSeconds(), s.timeoutMs(), s.maxRows(), s.downAfter(), s.hysteresis(), s.openOnWarn(),
                    s.conditions(), s.fields(), paused, s.updatedAt(), s.updatedBy(), s.parameters(), s.window(),
                    s.retry());
            case HttpMonitorDef h -> new HttpMonitorDef(id, name, groupId, h.method(), h.url(), h.headers(),
                    h.secretHeaders(), h.body(), h.intervalSeconds(), h.timeoutMs(), h.followRedirects(),
                    h.downAfter(), h.hysteresis(), h.openOnWarn(), h.conditions(), h.fields(), paused, h.updatedAt(),
                    h.updatedBy(), h.steps(), h.oauth(), h.window(), h.retry());
            case CheckMonitorDef c -> new CheckMonitorDef(id, name, groupId, c.type(), c.host(), c.port(),
                    keepPushToken ? c.pushToken() : null, c.maxSilenceSeconds(), c.intervalSeconds(), c.timeoutMs(),
                    c.downAfter(), c.hysteresis(), c.openOnWarn(), c.conditions(), c.fields(), paused, c.updatedAt(),
                    c.updatedBy(), c.probe(), c.window(), c.retry());
            default -> throw new IllegalArgumentException("Unknown monitor kind: " + def.kind());
        };
    }
}
