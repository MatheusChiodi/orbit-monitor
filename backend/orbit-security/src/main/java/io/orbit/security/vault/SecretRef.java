package io.orbit.security.vault;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A secret as stored in a config file: either encrypted ({@code {"enc": "v1:..."}}) or a reference
 * to an environment variable ({@code "${env:NAME}"}). Plain text is refused on load.
 */
public record SecretRef(String encrypted, String envName) {

    private static final Pattern ENV = Pattern.compile("^\\$\\{env:([A-Za-z_][A-Za-z0-9_]*)}$");

    public SecretRef {
        if ((encrypted == null) == (envName == null)) {
            throw new VaultException("A secret is either encrypted or an environment reference");
        }
    }

    public static SecretRef encrypted(String token) {
        return new SecretRef(token, null);
    }

    public static SecretRef env(String name) {
        if (!ENV.matcher("${env:" + name + "}").matches()) {
            throw new VaultException("Invalid environment variable name");
        }
        return new SecretRef(null, name);
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static SecretRef fromJson(JsonNode node) {
        if (node.isObject() && node.path("enc").isTextual()) {
            return encrypted(node.get("enc").asText());
        }
        if (node.isTextual()) {
            Matcher m = ENV.matcher(node.asText());
            if (m.matches()) {
                return env(m.group(1));
            }
        }
        throw new VaultException("Secrets must be {\"enc\": \"v1:...\"} or \"${env:NAME}\"; plain text is not allowed");
    }

    @JsonValue
    public Object toJson() {
        return encrypted != null ? Map.of("enc", encrypted) : "${env:" + envName + "}";
    }

    /** What the API and console show: never the secret, never the ciphertext. */
    public String masked() {
        return encrypted != null ? "•••• (vault)" : "${env:" + envName + "}";
    }

    @Override
    public String toString() {
        return "SecretRef[" + masked() + "]";
    }
}
