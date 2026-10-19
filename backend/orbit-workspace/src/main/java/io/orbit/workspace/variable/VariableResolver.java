package io.orbit.workspace.variable;

import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;

import java.util.Map;

/**
 * BE-39: workspace variables (orbit.variables.json) referenced as {@code ${var:name}} and secrets as
 * {@code ${vault:name}} in request URLs, headers, bodies and SQL parameters.
 */
public class VariableResolver {

    public VariableResolver(Map<String, String> variables, Map<String, SecretRef> secrets, SecretResolver vault) {
    }

    /** Replaces every reference; an unknown name is an {@link IllegalArgumentException} naming it. */
    public String resolve(String template) {
        throw new UnsupportedOperationException("BE-39 workspace variables are not implemented yet");
    }

    /** Same as {@link #resolve} but vault values are shown as {@code ••••} (for previews and logs). */
    public String resolveMasked(String template) {
        throw new UnsupportedOperationException("BE-39 workspace variables are not implemented yet");
    }
}
