package io.orbit.workspace.variable;

import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * BE-39: workspace variables (orbit.variables.json) referenced as {@code ${var:name}} and secrets as
 * {@code ${vault:name}} in request URLs, headers, bodies and SQL parameters. Substitution is a single
 * pass: a value that itself contains {@code ${...}} is never expanded again. Other references (such
 * as {@code ${env:NAME}}) are left untouched.
 */
public class VariableResolver {

    public static final String MASK = "••••";
    private static final Pattern REFERENCE = Pattern.compile("\\$\\{(var|vault):([A-Za-z_][A-Za-z0-9_.-]*)}");

    private final Map<String, String> variables;
    private final Map<String, SecretRef> secrets;
    private final SecretResolver vault;

    public VariableResolver(Map<String, String> variables, Map<String, SecretRef> secrets, SecretResolver vault) {
        this.variables = Map.copyOf(variables);
        this.secrets = Map.copyOf(secrets);
        this.vault = vault;
    }

    /** Replaces every reference; an unknown name is an {@link IllegalArgumentException} naming it. */
    public String resolve(String template) {
        return replace(template, false);
    }

    /** Same as {@link #resolve} but vault values are shown as {@code ••••} (for previews and logs). */
    public String resolveMasked(String template) {
        return replace(template, true);
    }

    private String replace(String template, boolean masked) {
        if (template == null || template.indexOf("${") < 0) {
            return template;
        }
        Matcher m = REFERENCE.matcher(template);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            String name = m.group(2);
            String value = "var".equals(m.group(1)) ? variable(name) : secret(name, masked);
            m.appendReplacement(out, Matcher.quoteReplacement(value));
        }
        m.appendTail(out);
        return out.toString();
    }

    private String variable(String name) {
        String value = variables.get(name);
        if (value == null) {
            throw new IllegalArgumentException("Unknown workspace variable: " + name);
        }
        return value;
    }

    private String secret(String name, boolean masked) {
        SecretRef ref = secrets.get(name);
        if (ref == null) {
            throw new IllegalArgumentException("Unknown vault secret: " + name);
        }
        return masked ? MASK : vault.resolve(ref);
    }
}
