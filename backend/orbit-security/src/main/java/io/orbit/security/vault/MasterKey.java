package io.orbit.security.vault;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * The 256-bit AES key that encrypts secrets inside the config files. It lives in
 * {@code ~/.orbit/master.key} (never inside the config directory), is generated on first run
 * and is readable by the current user only where the OS allows it.
 */
public final class MasterKey {

    private static final int KEY_BYTES = 32;

    private final SecretKey key;

    private MasterKey(byte[] bytes) {
        this.key = new SecretKeySpec(bytes, "AES");
    }

    public static MasterKey loadOrCreate(Path keyFile) {
        try {
            if (Files.exists(keyFile)) {
                byte[] bytes = Base64.getDecoder().decode(Files.readString(keyFile, StandardCharsets.US_ASCII).strip());
                if (bytes.length != KEY_BYTES) {
                    throw new VaultException("Master key must be 256 bits: " + keyFile);
                }
                return new MasterKey(bytes);
            }
            byte[] bytes = new byte[KEY_BYTES];
            new SecureRandom().nextBytes(bytes);
            if (keyFile.getParent() != null) {
                Files.createDirectories(keyFile.getParent());
            }
            Files.writeString(keyFile, Base64.getEncoder().encodeToString(bytes), StandardCharsets.US_ASCII);
            restrictToOwner(keyFile);
            return new MasterKey(bytes);
        } catch (IllegalArgumentException e) {
            throw new VaultException("Master key is not valid base64: " + keyFile, e);
        } catch (IOException e) {
            throw new VaultException("Could not read or create the master key: " + keyFile, e);
        }
    }

    SecretKey secretKey() {
        return key;
    }

    /** Short SHA-256 fingerprint to tell keys apart in diagnostics without exposing them. */
    public String fingerprint() {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(key.getEncoded());
            return HexFormat.of().formatHex(digest, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public String toString() {
        return "MasterKey[" + fingerprint() + "]";
    }

    private static void restrictToOwner(Path file) {
        try {
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        } catch (UnsupportedOperationException | IOException e) {
            // Windows: the user profile directory already limits access
        }
    }
}
