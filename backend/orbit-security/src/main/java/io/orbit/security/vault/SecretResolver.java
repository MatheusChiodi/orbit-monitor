package io.orbit.security.vault;

import java.util.function.Function;

/** Turns a {@link SecretRef} into the plain value at use time, and seals typed secrets. */
public class SecretResolver {

    private final SecretCipher cipher;
    private final Function<String, String> environment;

    public SecretResolver(SecretCipher cipher, Function<String, String> environment) {
        this.cipher = cipher;
        this.environment = environment;
    }

    public String resolve(SecretRef ref) {
        if (ref.encrypted() != null) {
            return cipher.decrypt(ref.encrypted());
        }
        String value = environment.apply(ref.envName());
        if (value == null) {
            throw new VaultException("Environment variable not set: " + ref.envName());
        }
        return value;
    }

    /** Encrypts a secret typed in the console before it is written to a config file. */
    public SecretRef seal(String plaintext) {
        return SecretRef.encrypted(cipher.encrypt(plaintext));
    }
}
