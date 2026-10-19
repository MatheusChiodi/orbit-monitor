package io.orbit.workspace.theme;

import io.orbit.config.ConfigItem;

import java.util.List;
import java.util.Map;

/**
 * BE-40: workspace defaults (theme, animation level, density, locale, scale) and custom color themes
 * (orbit.themes.json). Themes are validated on the server: text and state colors must keep
 * WCAG contrast against the surfaces (4.5:1 body text, 3:1 large labels).
 */
public final class ThemeService {

    /** @param tokens CSS token name to hex color, e.g. {@code --text -> #eef2f7} */
    public record Theme(String id, String name, Map<String, String> tokens) implements ConfigItem {
    }

    public record Defaults(String themeId, String animationLevel, String density, String locale, double scale) {
    }

    private ThemeService() {
    }

    /** WCAG 2.x contrast ratio between two {@code #rrggbb} colors (1.0 to 21.0). */
    public static double contrast(String foreground, String background) {
        throw new UnsupportedOperationException("BE-40 theme validation is not implemented yet");
    }

    /** Problems of a theme: missing tokens, invalid colors, low contrast (empty when valid). */
    public static List<String> validate(Theme theme) {
        throw new UnsupportedOperationException("BE-40 theme validation is not implemented yet");
    }

    /** Built-in defaults: dark theme, full animation, comfortable density, en, scale 1.0. */
    public static Defaults builtInDefaults() {
        throw new UnsupportedOperationException("BE-40 workspace defaults are not implemented yet");
    }
}
