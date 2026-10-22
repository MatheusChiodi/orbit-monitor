package io.orbit.workspace.customization;

import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidator;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.regex.Pattern;

/**
 * BE-51 / FE-54: custom terminology in {@code orbit.terminology.json}, one item per locale
 * ({@code id} = {@code en} or {@code pt-BR}) mapping an i18n key to the workspace's own label
 * ({@code status.DOWN -> Offline}). Labels are plain text: markup is refused.
 */
public class TerminologyService {

    public static final List<String> LOCALES = List.of("en", "pt-BR");
    static final int MAX_TERMS = 2_000;
    static final int MAX_TEXT = 120;
    private static final Pattern KEY = Pattern.compile("[A-Za-z0-9_][A-Za-z0-9_.-]{0,119}");

    public record Terms(String id, Map<String, String> terms, Instant updatedAt, String updatedBy)
            implements ConfigItem {
        public Terms {
            terms = terms == null ? Map.of() : java.util.Collections.unmodifiableMap(new TreeMap<>(terms));
        }
    }

    public static final ConfigValidator<Terms> VALIDATOR = items -> {
        List<String> errors = new ArrayList<>();
        for (Terms t : items) {
            if (!LOCALES.contains(t.id())) {
                errors.add(t.id() + ": locale must be en or pt-BR");
            }
            if (t.terms().size() > MAX_TERMS) {
                errors.add(t.id() + ": at most " + MAX_TERMS + " terms");
            }
            t.terms().forEach((key, text) -> {
                if (!KEY.matcher(key).matches()) {
                    errors.add(t.id() + ": keys look like status.DOWN");
                } else if (text == null || text.isBlank() || text.length() > MAX_TEXT) {
                    errors.add(t.id() + ": " + key + " needs a text of 1 to " + MAX_TEXT + " characters");
                } else if (text.chars().anyMatch(c -> c == '<' || c == '>' || Character.isISOControl(c))) {
                    errors.add(t.id() + ": " + key + " must be plain text (no markup or control characters)");
                }
            });
        }
        return errors;
    };

    private final ConfigFile<Terms> file;
    private final Clock clock;

    public TerminologyService(ConfigFile<Terms> file, Clock clock) {
        this.file = file;
        this.clock = clock;
    }

    public TerminologyService(ConfigFile<Terms> file) {
        this(file, Clock.systemUTC());
    }

    public List<Terms> list() {
        return file.items().stream().sorted(Comparator.comparing(Terms::id)).toList();
    }

    public Optional<Terms> find(String locale) {
        return file.items().stream().filter(t -> t.id().equals(locale)).findFirst();
    }

    /** Custom labels of a locale; empty when none are set. */
    public Map<String, String> terms(String locale) {
        return find(locale).map(Terms::terms).orElse(Map.of());
    }

    /** Replaces every custom label of the locale. */
    public synchronized Terms save(String locale, Map<String, String> terms, String operator) {
        Terms saved = new Terms(locale, terms, clock.instant(), OperatorName.normalize(operator));
        List<Terms> items = new ArrayList<>(file.items().stream().filter(t -> !t.id().equals(locale)).toList());
        items.add(saved);
        file.save(items);
        return saved;
    }

    public synchronized boolean delete(String locale) {
        List<Terms> remaining = file.items().stream().filter(t -> !t.id().equals(locale)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }
}
