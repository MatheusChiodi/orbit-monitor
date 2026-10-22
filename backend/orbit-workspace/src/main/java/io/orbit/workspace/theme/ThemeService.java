package io.orbit.workspace.theme;

import io.orbit.config.ConfigItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * BE-40: workspace defaults (theme, animation level, density, locale, scale) and custom color themes
 * (orbit.themes.json). Themes are validated on the server: text and state colors must keep
 * WCAG contrast against the surfaces (4.5:1 body text, 3:1 large labels).
 */
public final class ThemeService {

    /** @param tokens CSS token name to hex color, e.g. {@code --text -> #eef2f7} */
    public record Theme(String id, String name, Map<String, String> tokens) implements ConfigItem {
        public Theme {
            tokens = tokens == null ? Map.of() : Map.copyOf(tokens);
        }
    }

    public record Defaults(String themeId, String animationLevel, String density, String locale, double scale) {
    }

    /** Surfaces every text and state color is measured against. */
    static final List<String> SURFACES = List.of("--bg", "--s1");
    /** Body text: WCAG 1.4.3 (4.5:1). */
    static final List<String> TEXT = List.of("--text", "--muted");
    /** State colors are large labels and non-text marks: WCAG 1.4.3 large text / 1.4.11 (3:1). */
    static final List<String> STATES = List.of("--ok", "--warn", "--down", "--info");
    static final double TEXT_RATIO = 4.5;
    static final double LARGE_RATIO = 3.0;
    private static final Pattern HEX = Pattern.compile("#[0-9a-fA-F]{6}");

    private ThemeService() {
    }

    /** WCAG 2.x contrast ratio between two {@code #rrggbb} colors (1.0 to 21.0). */
    public static double contrast(String foreground, String background) {
        double a = luminance(foreground);
        double b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    }

    /** Problems of a theme: missing tokens, invalid colors, low contrast (empty when valid). */
    public static List<String> validate(Theme theme) {
        List<String> errors = new ArrayList<>();
        if (theme.id() == null || theme.id().isBlank()) {
            errors.add("id is required");
        }
        if (theme.name() == null || theme.name().isBlank()) {
            errors.add("name is required");
        }
        List<String> required = new ArrayList<>(SURFACES);
        required.addAll(TEXT);
        required.addAll(STATES);
        for (String token : required) {
            String color = theme.tokens().get(token);
            if (color == null) {
                errors.add(token + ": missing");
            } else if (!HEX.matcher(color).matches()) {
                errors.add(token + ": must be a #rrggbb color");
            }
        }
        theme.tokens().forEach((token, color) -> {
            if (!required.contains(token) && (color == null || !HEX.matcher(color).matches())) {
                errors.add(token + ": must be a #rrggbb color");
            }
        });
        if (!errors.isEmpty()) {
            return errors;
        }
        check(theme, TEXT, TEXT_RATIO, errors);
        check(theme, STATES, LARGE_RATIO, errors);
        return errors;
    }

    /** Built-in defaults: dark theme, full animation, comfortable density, en, scale 1.0. */
    public static Defaults builtInDefaults() {
        return new Defaults("dark", "full", "comfortable", "en", 1.0);
    }

    private static void check(Theme theme, List<String> tokens, double minimum, List<String> errors) {
        for (String token : tokens) {
            for (String surface : SURFACES) {
                double ratio = contrast(theme.tokens().get(token), theme.tokens().get(surface));
                if (ratio < minimum) {
                    errors.add(String.format(Locale.ROOT, "%s on %s: contrast %.2f:1 is below %.1f:1",
                            token, surface, ratio, minimum));
                }
            }
        }
    }

    private static double luminance(String hex) {
        if (hex == null || !HEX.matcher(hex).matches()) {
            throw new IllegalArgumentException("Not a #rrggbb color");
        }
        int rgb = Integer.parseInt(hex.substring(1), 16);
        return 0.2126 * channel(rgb >> 16) + 0.7152 * channel(rgb >> 8) + 0.0722 * channel(rgb);
    }

    private static double channel(int value) {
        double c = (value & 0xFF) / 255.0;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
}
