package io.orbit.security.vault;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/** AES-256-GCM with a random 96-bit IV per secret; tokens look like {@code v1:<base64(iv | ciphertext)>}. */
public class SecretCipher {

    private static final String PREFIX = "v1:";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final MasterKey masterKey;
    private final SecureRandom random = new SecureRandom();

    public SecretCipher(MasterKey masterKey) {
        this.masterKey = masterKey;
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, masterKey.secretKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] out = ByteBuffer.allocate(iv.length + ciphertext.length).put(iv).put(ciphertext).array();
            return PREFIX + Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new VaultException("Encryption failed", e);
        }
    }

    public String decrypt(String token) {
        if (token == null || !token.startsWith(PREFIX)) {
            throw new VaultException("Unsupported secret format");
        }
        try {
            byte[] data = Base64.getDecoder().decode(token.substring(PREFIX.length()));
            if (data.length <= IV_BYTES) {
                throw new VaultException("Secret is truncated");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, masterKey.secretKey(), new GCMParameterSpec(TAG_BITS, data, 0, IV_BYTES));
            byte[] plaintext = cipher.doFinal(data, IV_BYTES, data.length - IV_BYTES);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException | GeneralSecurityException e) {
            throw new VaultException("Secret could not be decrypted (wrong master key or tampered value)", e);
        }
    }
}
