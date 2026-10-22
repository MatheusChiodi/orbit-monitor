package io.orbit.workspace.customization;

import com.fasterxml.jackson.databind.JsonNode;
import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidationException;
import io.orbit.config.ConfigValidator;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * BE-51 / CORE-21: customization values in {@code orbit.customization.json} for the scopes kept on the
 * server (docs/07-customization.md section 6): {@code workspace}, {@code layout:<layoutId>},
 * {@code instance:<instanceId>} and named {@code profile:<profileId>} bundles. Device values stay in the
 * browser. Values are plain JSON per setting id; the frontend registry owns their meaning. Safety
 * guarantees (section 7) cannot be customized and secrets are never accepted.
 */
public class CustomizationService {

    public static final String PROFILE_FORMAT = "orbit.customization-profile";
    public static final List<String> SCOPES = List.of("workspace", "layout", "instance", "profile");
    /** Section 7: privacy, access policy, SQL/HTTP guards and reduced motion are not settings. */
    static final List<String> RESERVED_PREFIXES = List.of("privacy.", "access.", "security.", "guard.", "guards.",
            "sql.guard", "http.guard", "vault.", "motion.reducedMotion");
    static final int MAX_VALUES = 500;
    static final int MAX_VALUE_CHARS = 4_096;
    private static final Pattern SETTING_ID = Pattern.compile("[a-zA-Z][a-zA-Z0-9]*(?:\\.[a-zA-Z0-9][a-zA-Z0-9-]*){0,8}");
    private static final Pattern TARGET = Pattern.compile("[A-Za-z0-9][A-Za-z0-9_.-]{0,99}");
    private static final int NAME_MAX = 60;

    /**
     * One scope. {@code id} is {@code workspace} or {@code <scope>:<target>}; {@code name} is required
     * for profiles.
     */
    public record Entry(String id, String scope, String target, String name, Map<String, JsonNode> values,
                        Instant updatedAt, String updatedBy) implements ConfigItem {
        public Entry {
            values = values == null ? Map.of() : java.util.Collections.unmodifiableMap(new LinkedHashMap<>(values));
        }
    }

    /** Portable profile file (export/import, FE-57); carries no ids of this workspace and no secrets. */
    public record ProfileFile(String format, int version, String name, Map<String, JsonNode> values) {
    }

    public static final ConfigValidator<Entry> VALIDATOR = entries -> {
        List<String> errors = new ArrayList<>();
        entries.forEach(e -> errors.addAll(validate(e)));
        return errors;
    };

    private final ConfigFile<Entry> file;
    private final Clock clock;

    public CustomizationService(ConfigFile<Entry> file, Clock clock) {
        this.file = file;
        this.clock = clock;
    }

    public CustomizationService(ConfigFile<Entry> file) {
        this(file, Clock.systemUTC());
    }

    public static String idOf(String scope, String target) {
        return "workspace".equals(scope) ? "workspace" : scope + ":" + target;
    }

    public List<Entry> list() {
        return file.items();
    }

    public Optional<Entry> find(String scope, String target) {
        String id = idOf(scope, target);
        return file.items().stream().filter(e -> e.id().equals(id)).findFirst();
    }

    /** Replaces the values of one scope. */
    public synchronized Entry save(String scope, String target, String name, Map<String, JsonNode> values,
                                   String operator) {
        String by = OperatorName.normalize(operator);
        String cleanTarget = "workspace".equals(scope) ? null : target;
        Entry entry = new Entry(idOf(scope, cleanTarget), scope, cleanTarget, name == null ? null : name.strip(), values,
                clock.instant(), by);
        List<String> errors = validate(entry);
        if (!errors.isEmpty()) {
            throw new ConfigValidationException(errors);
        }
        List<Entry> items = new ArrayList<>(file.items().stream().filter(e -> !e.id().equals(entry.id())).toList());
        items.add(entry);
        file.save(items);
        return entry;
    }

    public synchronized boolean delete(String scope, String target) {
        String id = idOf(scope, target);
        List<Entry> remaining = file.items().stream().filter(e -> !e.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }

    /** Server-side scopes merged: workspace, then the layout, then the instance (highest wins). */
    public Map<String, JsonNode> resolve(String layoutId, String instanceId) {
        Map<String, JsonNode> merged = new LinkedHashMap<>();
        find("workspace", null).ifPresent(e -> merged.putAll(e.values()));
        if (layoutId != null) {
            find("layout", layoutId).ifPresent(e -> merged.putAll(e.values()));
        }
        if (instanceId != null) {
            find("instance", instanceId).ifPresent(e -> merged.putAll(e.values()));
        }
        return merged;
    }

    public Optional<ProfileFile> exportProfile(String profileId) {
        return find("profile", profileId).map(e -> new ProfileFile(PROFILE_FORMAT, 1, e.name(), e.values()));
    }

    /** Imports a profile file under {@code profileId}; the same validation as a save applies. */
    public Entry importProfile(String profileId, ProfileFile profile, String operator) {
        if (profile == null || !PROFILE_FORMAT.equals(profile.format()) || profile.version() != 1) {
            throw new ConfigValidationException(List.of("not an Orbit customization profile (format "
                    + PROFILE_FORMAT + ", version 1)"));
        }
        return save("profile", profileId, profile.name(), profile.values(), operator);
    }

    static List<String> validate(Entry e) {
        List<String> errors = new ArrayList<>();
        String label = e.id() == null ? "entry" : e.id();
        if (!SCOPES.contains(e.scope())) {
            errors.add(label + ": scope must be workspace, layout, instance or profile");
            return errors;
        }
        boolean workspace = "workspace".equals(e.scope());
        if (!workspace && (e.target() == null || !TARGET.matcher(e.target()).matches())) {
            errors.add(label + ": target must be an id (letters, digits, '_', '.', '-')");
        }
        if (!idOf(e.scope(), e.target()).equals(e.id())) {
            errors.add(label + ": id must be " + (workspace ? "workspace" : "<scope>:<target>"));
        }
        if ("profile".equals(e.scope()) && (e.name() == null || e.name().isBlank() || e.name().length() > NAME_MAX)) {
            errors.add(label + ": a profile needs a name (up to " + NAME_MAX + " characters)");
        }
        if (e.values().size() > MAX_VALUES) {
            errors.add(label + ": at most " + MAX_VALUES + " settings per scope");
        }
        e.values().forEach((setting, value) -> errors.addAll(validateValue(label, setting, value)));
        return errors;
    }

    private static List<String> validateValue(String label, String setting, JsonNode value) {
        List<String> errors = new ArrayList<>();
        if (setting == null || setting.length() > 100 || !SETTING_ID.matcher(setting).matches()) {
            errors.add(label + ": setting ids look like card.monitor.clickAction");
            return errors;
        }
        if (RESERVED_PREFIXES.stream().anyMatch(setting::startsWith)) {
            errors.add(label + ": " + setting + " is a safety guarantee and cannot be customized");
        }
        if (value == null || value.toString().length() > MAX_VALUE_CHARS) {
            errors.add(label + ": " + setting + " value is missing or larger than " + MAX_VALUE_CHARS + " characters");
        } else if (containsSecret(value)) {
            errors.add(label + ": " + setting + " cannot hold a secret or a vault/environment reference");
        }
        return errors;
    }

    private static boolean containsSecret(JsonNode node) {
        if (node.isTextual()) {
            String text = node.asText();
            return text.contains("${env:") || text.contains("${vault:");
        }
        if (node.isObject()) {
            if (node.has("enc")) {
                return true;
            }
            Iterator<JsonNode> children = node.elements();
            while (children.hasNext()) {
                if (containsSecret(children.next())) {
                    return true;
                }
            }
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                if (containsSecret(child)) {
                    return true;
                }
            }
        }
        return false;
    }
}
