package io.orbit.security.settings;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.security.access.AccessMode;
import io.orbit.security.access.AccessPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-40 workspace defaults in orbit.settings.json")
class WorkspaceDefaultsTest {

    @TempDir
    Path dir;

    private SettingsService service() {
        return new SettingsService(new ConfigFile<>(dir, "settings", OrbitSettings.class, ConfigMapper.create(),
                SettingsService.VALIDATOR), AccessPolicy.loopbackOnly());
    }

    @Test
    @DisplayName("without a file the built-in defaults match the frontend defaults")
    void builtIn() {
        assertThat(service().defaults()).isEqualTo(new WorkspaceDefaults("orbit-dark", "standard", "comfortable", "en",
                "3m"));
    }

    @Test
    @DisplayName("saving defaults keeps the access policy and fills unset fields with built-in values")
    void saveKeepsAccess() {
        SettingsService s = service();
        s.save(new OrbitSettings(null, new OrbitSettings.Access("lan", List.of(), true), "en", null, null, null, null,
                null), "Ana");

        WorkspaceDefaults saved = s.saveDefaults(new WorkspaceDefaults("nord", "minimal", null, "pt-BR", "5m"), "Bia");

        assertThat(saved).isEqualTo(new WorkspaceDefaults("nord", "minimal", "comfortable", "pt-BR", "5m"));
        SettingsService reloaded = service();
        assertThat(reloaded.defaults()).isEqualTo(saved);
        assertThat(reloaded.policy().mode()).isEqualTo(AccessMode.LAN);
        assertThat(reloaded.current().updatedBy()).isEqualTo("Bia");
        assertThat(reloaded.current().density()).isNull();
    }

    @Test
    @DisplayName("unknown values are rejected")
    void invalid() {
        SettingsService s = service();
        assertThatThrownBy(() -> s.saveDefaults(new WorkspaceDefaults(null, "wild", null, null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.saveDefaults(new WorkspaceDefaults(null, null, "huge", null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.saveDefaults(new WorkspaceDefaults(null, null, null, null, "10m"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.saveDefaults(new WorkspaceDefaults("Not A Theme!", null, null, null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }
}
