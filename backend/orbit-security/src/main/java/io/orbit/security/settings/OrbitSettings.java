package io.orbit.security.settings;

import io.orbit.config.ConfigItem;

import java.time.Instant;
import java.util.List;

/**
 * Contents of orbit.settings.json (one item, id {@code default}): who may edit, defaults for the
 * console and the in-memory history window. Null fields mean "use the built-in default".
 */
public record OrbitSettings(
        String id,
        Access access,
        String locale,
        String theme,
        String animationLevel,
        Integer historyHours,
        Instant updatedAt,
        String updatedBy) implements ConfigItem {

    public static final String ID = "default";

    /**
     * @param editFrom {@code loopback}, {@code lan} or {@code cidr}
     * @param cidrs    ranges allowed to edit when {@code editFrom} is {@code cidr}
     */
    public record Access(String editFrom, List<String> cidrs, boolean lanAcknowledge) {
        public Access {
            cidrs = cidrs == null ? List.of() : List.copyOf(cidrs);
        }
    }

    public static OrbitSettings defaults() {
        return new OrbitSettings(ID, null, "en", null, null, 24, null, null);
    }

    OrbitSettings stamped(String operator, Instant at) {
        return new OrbitSettings(ID, access, locale == null ? "en" : locale, theme, animationLevel,
                historyHours == null ? 24 : historyHours, at, operator);
    }
}
