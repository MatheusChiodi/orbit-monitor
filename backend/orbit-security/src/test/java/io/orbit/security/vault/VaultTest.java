package io.orbit.security.vault;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VaultTest {

    @TempDir
    Path home;

    @Test
    void masterKeyIsGeneratedOnceAndReused() throws Exception {
        Path keyFile = home.resolve("master.key");

        MasterKey first = MasterKey.loadOrCreate(keyFile);
        MasterKey second = MasterKey.loadOrCreate(keyFile);

        assertThat(Files.exists(keyFile)).isTrue();
        assertThat(first.fingerprint()).isEqualTo(second.fingerprint());
        assertThat(Files.readString(keyFile).strip()).hasSize(44);
    }

    @Test
    void corruptKeyFileIsRejected() throws Exception {
        Path keyFile = home.resolve("master.key");
        Files.writeString(keyFile, "short");
        assertThatThrownBy(() -> MasterKey.loadOrCreate(keyFile)).isInstanceOf(VaultException.class);
    }

    @Test
    void encryptsWithRandomIvAndDecrypts() {
        SecretCipher cipher = new SecretCipher(MasterKey.loadOrCreate(home.resolve("master.key")));

        String a = cipher.encrypt("s3cr3t");
        String b = cipher.encrypt("s3cr3t");

        assertThat(a).startsWith("v1:").doesNotContain("s3cr3t").isNotEqualTo(b);
        assertThat(cipher.decrypt(a)).isEqualTo("s3cr3t");
        assertThat(cipher.decrypt(b)).isEqualTo("s3cr3t");
    }

    @Test
    void tamperedOrForeignCiphertextFails() {
        SecretCipher cipher = new SecretCipher(MasterKey.loadOrCreate(home.resolve("a.key")));
        SecretCipher other = new SecretCipher(MasterKey.loadOrCreate(home.resolve("b.key")));
        String token = cipher.encrypt("value");
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("A") ? "BB" : "AA");

        assertThatThrownBy(() -> cipher.decrypt(tampered)).isInstanceOf(VaultException.class);
        assertThatThrownBy(() -> other.decrypt(token)).isInstanceOf(VaultException.class);
        assertThatThrownBy(() -> cipher.decrypt("v9:abc")).isInstanceOf(VaultException.class);
    }

    @Test
    void secretRefSerializesAsEncObjectOrEnvString() throws Exception {
        ObjectMapper json = new ObjectMapper();

        assertThat(json.writeValueAsString(SecretRef.encrypted("v1:abc"))).isEqualTo("{\"enc\":\"v1:abc\"}");
        assertThat(json.writeValueAsString(SecretRef.env("CORE_DB_PASSWORD"))).isEqualTo("\"${env:CORE_DB_PASSWORD}\"");
        assertThat(json.readValue("{\"enc\":\"v1:abc\"}", SecretRef.class)).isEqualTo(SecretRef.encrypted("v1:abc"));
        assertThat(json.readValue("\"${env:X_Y}\"", SecretRef.class)).isEqualTo(SecretRef.env("X_Y"));
    }

    @Test
    void plainTextSecretsAreRefusedInConfigFiles() {
        ObjectMapper json = new ObjectMapper();
        assertThatThrownBy(() -> json.readValue("\"hunter2\"", SecretRef.class)).hasRootCauseInstanceOf(VaultException.class);
    }

    @Test
    void resolverDecryptsOrReadsEnvironment() {
        SecretCipher cipher = new SecretCipher(MasterKey.loadOrCreate(home.resolve("master.key")));
        SecretResolver resolver = new SecretResolver(cipher, Map.of("CORE_DB_PASSWORD", "from-env")::get);

        assertThat(resolver.resolve(SecretRef.encrypted(cipher.encrypt("typed")))).isEqualTo("typed");
        assertThat(resolver.resolve(SecretRef.env("CORE_DB_PASSWORD"))).isEqualTo("from-env");
        assertThatThrownBy(() -> resolver.resolve(SecretRef.env("MISSING"))).isInstanceOf(VaultException.class);
    }

    @Test
    void sealTurnsTypedSecretIntoEncryptedRef() {
        SecretCipher cipher = new SecretCipher(MasterKey.loadOrCreate(home.resolve("master.key")));
        SecretResolver resolver = new SecretResolver(cipher, name -> null);

        SecretRef sealed = resolver.seal("typed-password");

        assertThat(sealed.encrypted()).startsWith("v1:");
        assertThat(resolver.resolve(sealed)).isEqualTo("typed-password");
    }

    @Test
    void maskedViewNeverRevealsTheSecret() {
        assertThat(SecretRef.encrypted("v1:abc").masked()).isEqualTo("•••• (vault)");
        assertThat(SecretRef.env("X").masked()).isEqualTo("${env:X}");
        assertThat(SecretRef.encrypted("v1:abc").toString()).doesNotContain("abc");
    }
}
