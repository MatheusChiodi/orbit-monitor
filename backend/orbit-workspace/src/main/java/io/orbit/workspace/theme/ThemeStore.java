package io.orbit.workspace.theme;

import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidator;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * BE-40: custom color themes in {@code orbit.themes.json}, same shape as the frontend
 * {@code OrbitTheme} (FE-01..FE-04). Every save is checked on the server with the FE-02 contrast rules
 * (WCAG 2.x: 4.5:1 body text, 3:1 large labels and state colors), so a file edited by hand or a
 * crafted request cannot make the wall unreadable.
 */
public class ThemeStore {

    /** Mirrors {@code frontend/src/shared/theme/types.ts}; unknown fields are dropped. */
    public record CustomTheme(String id, String name, String mode, String category, Map<String, String> colors,
                              List<String> chart, Map<String, String> syntax, Map<String, String> fx, String basedOn,
                              Instant updatedAt, String updatedBy) implements ConfigItem {
        public CustomTheme {
            colors = colors == null ? Map.of() : Map.copyOf(colors);
            chart = chart == null ? List.of() : List.copyOf(chart);
            syntax = syntax == null ? Map.of() : Map.copyOf(syntax);
            fx = fx == null ? Map.of() : Map.copyOf(fx);
        }

        CustomTheme stamped(String operator, Instant at) {
            return new CustomTheme(id, name == null ? null : name.strip(), mode == null ? "dark" : mode, "custom",
                    known(colors, COLOR_TOKENS), chart, known(syntax, SYNTAX_TOKENS), known(fx, FX_TOKENS), basedOn,
                    at, operator);
        }
    }

    static final List<String> COLOR_TOKENS = List.of("bg", "s1", "s2", "s3", "line", "line2", "text", "muted", "dim",
            "ok", "warn", "down", "info", "accent");
    static final List<String> SYNTAX_TOKENS = List.of("keyword", "string", "number", "comment", "function",
            "operator", "identifier");
    static final List<String> FX_TOKENS = List.of("from", "to", "glow");
    static final int CHART_SIZE = 8;
    private static final Pattern ID = Pattern.compile("[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?");
    private static final Pattern HEX = Pattern.compile("#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})");
    private static final int NAME_MAX = 60;

    /** FE-02 rule: foreground, the surfaces it sits on and the minimum ratio. */
    private record Rule(String foreground, List<String> backgrounds, double minimum) {
    }

    private static final List<Rule> RULES = List.of(
            new Rule("text", List.of("bg", "s1", "s2", "s3"), ThemeService.TEXT_RATIO),
            new Rule("muted", List.of("bg", "s1", "s2"), ThemeService.TEXT_RATIO),
            new Rule("dim", List.of("bg", "s1"), ThemeService.LARGE_RATIO),
            new Rule("ok", List.of("bg", "s1", "s2"), ThemeService.LARGE_RATIO),
            new Rule("warn", List.of("bg", "s1", "s2"), ThemeService.LARGE_RATIO),
            new Rule("down", List.of("bg", "s1", "s2"), ThemeService.LARGE_RATIO),
            new Rule("info", List.of("bg", "s1", "s2"), ThemeService.LARGE_RATIO),
            new Rule("accent", List.of("bg", "s1"), ThemeService.LARGE_RATIO));

    public static final ConfigValidator<CustomTheme> VALIDATOR = themes -> {
        List<String> errors = new ArrayList<>();
        themes.forEach(t -> errors.addAll(validate(t)));
        return errors;
    };

    private final ConfigFile<CustomTheme> file;
    private final Clock clock;

    public ThemeStore(ConfigFile<CustomTheme> file, Clock clock) {
        this.file = file;
        this.clock = clock;
    }

    public ThemeStore(ConfigFile<CustomTheme> file) {
        this(file, Clock.systemUTC());
    }

    public List<CustomTheme> list() {
        return file.items().stream().sorted(Comparator.comparing(CustomTheme::id)).toList();
    }

    public Optional<CustomTheme> find(String id) {
        return file.items().stream().filter(t -> t.id().equals(id)).findFirst();
    }

    /** Creates or replaces the theme with the same id; throws ConfigValidationException when unreadable. */
    public synchronized CustomTheme save(CustomTheme theme, String operator) {
        CustomTheme stamped = theme.stamped(OperatorName.normalize(operator), clock.instant());
        List<CustomTheme> items = new ArrayList<>(file.items().stream().filter(t -> !t.id().equals(theme.id())).toList());
        items.add(stamped);
        file.save(items);
        return stamped;
    }

    public synchronized boolean delete(String id) {
        List<CustomTheme> remaining = file.items().stream().filter(t -> !t.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }

    /** Shape and contrast problems of one theme (empty when valid). Errors name tokens, never other data. */
    public static List<String> validate(CustomTheme theme) {
        List<String> errors = new ArrayList<>();
        if (theme.id() == null || !ID.matcher(theme.id()).matches()) {
            errors.add("id must be lower-case letters, digits and '-' (up to 48)");
        }
        if (theme.name() == null || theme.name().isBlank() || theme.name().strip().length() > NAME_MAX) {
            errors.add("name is required (up to " + NAME_MAX + " characters)");
        }
        if (theme.mode() != null && !List.of("dark", "light").contains(theme.mode())) {
            errors.add("mode must be dark or light");
        }
        group(theme.colors(), COLOR_TOKENS, "", errors);
        group(theme.syntax(), SYNTAX_TOKENS, "syntax.", errors);
        group(theme.fx(), FX_TOKENS, "fx.", errors);
        if (theme.chart().size() != CHART_SIZE) {
            errors.add("chart: must have " + CHART_SIZE + " colors");
        }
        for (int i = 0; i < theme.chart().size(); i++) {
            if (!isHex(theme.chart().get(i))) {
                errors.add("chart." + i + ": must be a hex color");
            }
        }
        if (theme.basedOn() != null && !ID.matcher(theme.basedOn()).matches()) {
            errors.add("basedOn must be a theme id");
        }
        if (errors.isEmpty()) {
            contrast(theme.colors(), errors);
        }
        return errors;
    }

    private static void group(Map<String, String> colors, List<String> tokens, String prefix, List<String> errors) {
        for (String token : tokens) {
            String value = colors.get(token);
            if (value == null) {
                errors.add(prefix + token + ": missing");
            } else if (!isHex(value)) {
                errors.add(prefix + token + ": must be a hex color");
            }
        }
    }

    /** Unknown tokens are dropped (forward compatible, like the frontend schema). */
    private static Map<String, String> known(Map<String, String> colors, List<String> tokens) {
        Map<String, String> out = new java.util.LinkedHashMap<>();
        tokens.forEach(t -> {
            if (colors.containsKey(t)) {
                out.put(t, colors.get(t));
            }
        });
        return out;
    }

    private static void contrast(Map<String, String> colors, List<String> errors) {
        for (Rule rule : RULES) {
            for (String background : rule.backgrounds()) {
                double ratio = ThemeService.contrast(opaque(colors.get(rule.foreground())), opaque(colors.get(background)));
                if (ratio < rule.minimum()) {
                    errors.add(String.format(Locale.ROOT, "%s on %s: contrast %.2f:1 is below %.1f:1",
                            rule.foreground(), background, ratio, rule.minimum()));
                }
            }
        }
    }

    private static boolean isHex(String value) {
        return value != null && HEX.matcher(value).matches();
    }

    /** {@code #rgb} and {@code #rrggbbaa} to {@code #rrggbb} (alpha is ignored for contrast, like the frontend). */
    static String opaque(String hex) {
        String v = hex.toLowerCase(Locale.ROOT);
        if (v.length() == 4) {
            return "#" + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2) + v.charAt(3) + v.charAt(3);
        }
        return v.substring(0, 7);
    }
}
