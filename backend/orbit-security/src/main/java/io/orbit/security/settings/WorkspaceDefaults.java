package io.orbit.security.settings;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * BE-40: workspace defaults applied to every console and wall unless a device overrides them (FE-50).
 * Field names and values match the frontend {@code WorkspacePreferenceDefaults}. A null field means
 * "use the built-in default".
 *
 * @param scale viewing distance preset of the wall (FE-08): {@code 2m}, {@code 3m} or {@code 5m}
 */
public record WorkspaceDefaults(String theme, String animation, String density, String locale, String scale) {

    public static final WorkspaceDefaults BUILT_IN = new WorkspaceDefaults("orbit-dark", "standard", "comfortable",
            "en", "3m");
    public static final Set<String> ANIMATIONS = Set.of("off", "minimal", "standard", "expressive");
    public static final Set<String> DENSITIES = Set.of("compact", "comfortable", "spacious");
    public static final Set<String> LOCALES = Set.of("en", "pt-BR");
    public static final Set<String> SCALES = Set.of("2m", "3m", "5m");
    private static final Pattern THEME_ID = Pattern.compile("[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?");

    /** Set fields of this record over {@code base}. */
    public WorkspaceDefaults over(WorkspaceDefaults base) {
        return new WorkspaceDefaults(theme != null ? theme : base.theme, animation != null ? animation : base.animation,
                density != null ? density : base.density, locale != null ? locale : base.locale,
                scale != null ? scale : base.scale);
    }

    /** Problems of the set fields (empty when valid). */
    public List<String> validate() {
        List<String> errors = new ArrayList<>();
        if (theme != null && !THEME_ID.matcher(theme).matches()) {
            errors.add("theme must be a theme id");
        }
        check(animation, ANIMATIONS, "animationLevel must be off, minimal, standard or expressive", errors);
        check(density, DENSITIES, "density must be compact, comfortable or spacious", errors);
        check(locale, LOCALES, "locale must be en or pt-BR", errors);
        check(scale, SCALES, "scale must be 2m, 3m or 5m", errors);
        return errors;
    }

    private static void check(String value, Set<String> allowed, String error, List<String> errors) {
        if (value != null && !allowed.contains(value)) {
            errors.add(error);
        }
    }
}
