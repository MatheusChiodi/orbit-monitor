package io.orbit.security.settings;

import io.orbit.config.ConfigItem;

import java.time.Instant;
import java.util.List;

/**
 * Contents of orbit.settings.json (one item, id {@code default}): who may edit, workspace defaults
 * for the console and the wall (BE-40) and the in-memory history window. Null fields mean "use the
 * built-in default".
 */
public record OrbitSettings(
        String id,
        Access access,
        String locale,
        String theme,
        String animationLevel,
        String density,
        String scale,
        Integer historyHours,
        Instant updatedAt,
        String updatedBy,
        Branding branding) implements ConfigItem {

    public static final String ID = "default";

    /** Settings without workspace branding (FE-10). */
    public OrbitSettings(String id, Access access, String locale, String theme, String animationLevel,
                         String density, String scale, Integer historyHours, Instant updatedAt, String updatedBy) {
        this(id, access, locale, theme, animationLevel, density, scale, historyHours, updatedAt, updatedBy, null);
    }

    /**
     * FE-10: workspace name and logo shown in the console header and on the wall.
     *
     * @param logoSvg inline SVG, sanitized with {@link SvgSanitizer} before it is stored
     */
    public record Branding(String name, String logoSvg) {
    }

    /**
     * @param editFrom {@code loopback}, {@code lan} or {@code cidr}
     * @param cidrs    ranges allowed to edit when {@code editFrom} is {@code cidr}
     */
    public record Access(String editFrom, List<String> cidrs, boolean lanAcknowledge) {
        public Access {
            cidrs = cidrs == null ? List.of() : List.copyOf(cidrs);
        }
    }

    /** Settings without density and scale (kept for callers written before BE-40). */
    public OrbitSettings(String id, Access access, String locale, String theme, String animationLevel,
                         Integer historyHours, Instant updatedAt, String updatedBy) {
        this(id, access, locale, theme, animationLevel, null, null, historyHours, updatedAt, updatedBy);
    }

    public static OrbitSettings defaults() {
        return new OrbitSettings(ID, null, "en", null, null, 24, null, null);
    }

    /** The workspace defaults stored here; null fields fall back to {@link WorkspaceDefaults#BUILT_IN}. */
    public WorkspaceDefaults workspaceDefaults() {
        return new WorkspaceDefaults(theme, animationLevel, density, locale, scale);
    }

    OrbitSettings withDefaults(WorkspaceDefaults d) {
        return new OrbitSettings(ID, access, d.locale(), d.theme(), d.animation(), d.density(), d.scale(),
                historyHours, updatedAt, updatedBy, branding);
    }

    OrbitSettings stamped(String operator, Instant at) {
        Branding clean = branding == null ? null : new Branding(branding.name() == null ? null
                : branding.name().strip(), branding.logoSvg() == null || branding.logoSvg().isBlank() ? null
                : SvgSanitizer.sanitize(branding.logoSvg()));
        return new OrbitSettings(ID, access, locale == null ? "en" : locale, theme, animationLevel, density, scale,
                historyHours == null ? 24 : historyHours, at, operator, clean);
    }
}
