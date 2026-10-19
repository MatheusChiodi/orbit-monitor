package io.orbit.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-50 encrypted config backup with rotation")
class ConfigBackupTest {

    @TempDir
    Path home;

    @Test
    @DisplayName("backups are encrypted and only the last N are kept")
    void rotates() throws Exception {
        Path config = Files.createDirectories(home.resolve("config"));
        Files.writeString(config.resolve("orbit.groups.json"), "{\"version\":1,\"items\":[{\"id\":\"grp_secret_name\"}]}");
        ConfigBackup backup = new ConfigBackup(config, home.resolve("backups"), 2, bytes -> {
            byte[] out = bytes.clone();
            for (int i = 0; i < out.length; i++) {
                out[i] = (byte) (out[i] ^ 0x5A);
            }
            return out;
        });

        Path first = backup.create();
        backup.create();
        backup.create();

        assertThat(backup.list()).hasSize(2).doesNotContain(first);
        String raw = new String(Files.readAllBytes(backup.list().getFirst()), StandardCharsets.ISO_8859_1);
        assertThat(raw).doesNotContain("grp_secret_name");
        assertThat(backup.list().getFirst().getFileName().toString()).matches("orbit-backup-.*\\.zip\\.enc");
    }
}
