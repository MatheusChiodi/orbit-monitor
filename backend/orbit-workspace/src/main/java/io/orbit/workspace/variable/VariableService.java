package io.orbit.workspace.variable;

import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidationException;
import io.orbit.config.ConfigValidator;
import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * BE-39: workspace variables in {@code orbit.variables.json}. A plain variable ({@code ${var:name}})
 * keeps its value in the file; a vault variable ({@code ${vault:name}}) is sealed with the master key
 * (or points to {@code ${env:NAME}}) and its value is never returned by {@link #list()}.
 */
public class VariableService {

    public static final int MAX_VALUE_LENGTH = 4_096;
    private static final Pattern ID = Pattern.compile("[a-z][a-z0-9_-]{1,63}");
    private static final Pattern NAME = Pattern.compile("[A-Za-z_][A-Za-z0-9_.-]{0,63}");
    private static final Pattern ENV_REFERENCE = Pattern.compile("\\$\\{env:([A-Za-z_][A-Za-z0-9_]*)}");

    /** VAR: plain value; VAULT: sealed secret or environment reference. */
    public enum Kind { VAR, VAULT }

    /** As stored: exactly one of {@code value} (plain) and {@code secret} (vault) is set. */
    public record Variable(String id, String name, String value, SecretRef secret, String description,
                           Instant updatedAt, String updatedBy) implements ConfigItem {

        public Kind kind() {
            return secret != null ? Kind.VAULT : Kind.VAR;
        }
    }

    /**
     * What an editor sends. For VAULT, {@code value} is the plain secret (sealed before it is written),
     * a {@code ${env:NAME}} reference, or null to keep the current secret.
     */
    public record Input(String id, String name, Kind kind, String value, String description) {
    }

    /** What the API returns: vault values are {@code •••• (vault)} or the {@code ${env:NAME}} reference. */
    public record View(String id, String name, String kind, String value, String description, Instant updatedAt,
                       String updatedBy) {
    }

    public static final ConfigValidator<Variable> VALIDATOR = VariableService::validate;

    private final ConfigFile<Variable> file;
    private final SecretResolver vault;
    private final Clock clock;
    private final Function<String, String> environment;

    public VariableService(ConfigFile<Variable> file, SecretResolver vault, Clock clock,
                           Function<String, String> environment) {
        this.file = file;
        this.vault = vault;
        this.clock = clock;
        this.environment = environment;
    }

    public VariableService(ConfigFile<Variable> file, SecretResolver vault) {
        this(file, vault, Clock.systemUTC(), System::getenv);
    }

    public List<View> list() {
        return file.items().stream().sorted(Comparator.comparing(Variable::name)).map(VariableService::view).toList();
    }

    public Optional<View> find(String id) {
        return file.items().stream().filter(v -> v.id().equals(id)).findFirst().map(VariableService::view);
    }

    /** Creates or replaces the variable with the same id. */
    public synchronized View save(Input input, String operator) {
        String by = OperatorName.normalize(operator);
        Optional<Variable> current = file.items().stream().filter(v -> v.id().equals(input.id())).findFirst();
        Variable stored = toStored(input, current, by);
        List<Variable> items = new ArrayList<>(file.items().stream().filter(v -> !v.id().equals(input.id())).toList());
        items.add(stored);
        file.save(items);
        return view(stored);
    }

    public synchronized boolean delete(String id) {
        List<Variable> remaining = file.items().stream().filter(v -> !v.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }

    /** A resolver over the current file, used once per check run; vault values are decrypted only on use. */
    public VariableResolver resolver() {
        Map<String, String> plain = new HashMap<>();
        Map<String, SecretRef> secrets = new HashMap<>();
        for (Variable v : file.items()) {
            if (v.secret() != null) {
                secrets.put(v.name(), v.secret());
            } else {
                plain.put(v.name(), v.value());
            }
        }
        return new VariableResolver(plain, secrets, vault, environment);
    }

    private Variable toStored(Input input, Optional<Variable> current, String by) {
        Kind kind = input.kind() == null ? Kind.VAR : input.kind();
        Instant now = clock.instant();
        if (kind == Kind.VAR) {
            return new Variable(input.id(), input.name(), input.value(), null, input.description(), now, by);
        }
        SecretRef secret;
        Matcher env = ENV_REFERENCE.matcher(input.value() == null ? "" : input.value());
        if (input.value() == null || input.value().isEmpty()) {
            secret = current.map(Variable::secret).orElseThrow(() ->
                    new ConfigValidationException(List.of(input.id() + ": a vault variable needs a value")));
        } else if (env.matches()) {
            secret = SecretRef.env(env.group(1));
        } else if (input.value().length() > MAX_VALUE_LENGTH) {
            throw new ConfigValidationException(List.of(input.id() + ": value is too long"));
        } else {
            secret = vault.seal(input.value());
        }
        return new Variable(input.id(), input.name(), null, secret, input.description(), now, by);
    }

    private static View view(Variable v) {
        String value = v.secret() != null ? v.secret().masked() : v.value();
        return new View(v.id(), v.name(), v.kind().name().toLowerCase(Locale.ROOT), value, v.description(),
                v.updatedAt(), v.updatedBy());
    }

    private static List<String> validate(List<Variable> items) {
        List<String> errors = new ArrayList<>();
        Set<String> names = new HashSet<>();
        for (Variable v : items) {
            if (!ID.matcher(v.id()).matches()) {
                errors.add(v.id() + ": id must be lower-case letters, digits, '_' or '-'");
            }
            if (v.name() == null || !NAME.matcher(v.name()).matches()) {
                errors.add(v.id() + ": name must start with a letter or '_' and use letters, digits, '_', '.' or '-'");
            } else if (!names.add(v.name())) {
                errors.add(v.id() + ": name '" + v.name() + "' is already used");
            }
            if ((v.value() == null) == (v.secret() == null)) {
                errors.add(v.id() + ": a variable has either a value or a vault secret");
            }
            if (v.value() != null && v.value().length() > MAX_VALUE_LENGTH) {
                errors.add(v.id() + ": value is too long");
            }
        }
        return errors;
    }
}
