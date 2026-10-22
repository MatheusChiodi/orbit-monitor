package io.orbit.security.settings;

import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigValidator;
import io.orbit.security.access.AccessMode;
import io.orbit.security.access.AccessPolicy;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * CORE-08: reads and writes orbit.settings.json and derives the live {@link AccessPolicy} from it;
 * without a file (or without an access section) the policy from application properties applies.
 */
public class SettingsService {

    private static final Set<String> EDIT_FROM = Set.of("loopback", "lan", "cidr");

    public static final ConfigValidator<OrbitSettings> VALIDATOR = items -> {
        List<String> errors = new ArrayList<>();
        for (OrbitSettings s : items) {
            errors.addAll(s.workspaceDefaults().validate());
            if (s.historyHours() != null && (s.historyHours() < 1 || s.historyHours() > 168)) {
                errors.add("historyHours must be between 1 and 168");
            }
            if (s.access() != null) {
                String from = s.access().editFrom() == null ? "" : s.access().editFrom().toLowerCase(Locale.ROOT);
                if (!EDIT_FROM.contains(from)) {
                    errors.add("access.editFrom must be loopback, lan or cidr");
                } else if (from.equals("cidr") && s.access().cidrs().isEmpty()) {
                    errors.add("access.cidrs is required when editFrom is cidr");
                }
                try {
                    toPolicy(s.access());
                } catch (IllegalArgumentException e) {
                    errors.add("access: " + e.getMessage());
                }
            }
        }
        return errors;
    };

    private final ConfigFile<OrbitSettings> file;
    private final AccessPolicy fallback;
    private final Clock clock;

    public SettingsService(ConfigFile<OrbitSettings> file, AccessPolicy fallback, Clock clock) {
        this.file = file;
        this.fallback = fallback;
        this.clock = clock;
    }

    public SettingsService(ConfigFile<OrbitSettings> file, AccessPolicy fallback) {
        this(file, fallback, Clock.systemUTC());
    }

    public OrbitSettings current() {
        return file.items().stream().findFirst().orElse(OrbitSettings.defaults());
    }

    /** The policy in force now (re-read on every call, so saved changes apply at once). */
    public AccessPolicy policy() {
        OrbitSettings.Access access = current().access();
        return access == null ? fallback : toPolicy(access);
    }

    public synchronized OrbitSettings save(OrbitSettings settings, String operator) {
        OrbitSettings stamped = settings.stamped(OperatorName.normalize(operator), clock.instant());
        file.save(List.of(stamped));
        return stamped;
    }

    /** BE-40: effective workspace defaults (file values over the built-in ones). */
    public WorkspaceDefaults defaults() {
        return current().workspaceDefaults().over(WorkspaceDefaults.BUILT_IN);
    }

    /**
     * BE-40: replaces the workspace defaults (null fields go back to the built-in value) and keeps the
     * access policy and history window; returns the effective defaults.
     */
    public synchronized WorkspaceDefaults saveDefaults(WorkspaceDefaults defaults, String operator) {
        save(current().withDefaults(defaults), operator);
        return defaults();
    }

    public boolean reloadIfChanged() {
        return file.reloadIfChanged();
    }

    private static AccessPolicy toPolicy(OrbitSettings.Access access) {
        AccessMode mode = AccessMode.valueOf(access.editFrom().toUpperCase(Locale.ROOT));
        return new AccessPolicy(mode, access.cidrs()).withLanAcknowledge(access.lanAcknowledge());
    }
}
