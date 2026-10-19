package io.orbit.security.settings;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.security.access.AccessMode;
import io.orbit.security.access.AccessPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetAddress;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CORE-08 settings file drives the access policy")
class SettingsServiceTest {

    @TempDir
    Path dir;

    private SettingsService service() {
        return new SettingsService(new ConfigFile<>(dir, "settings", OrbitSettings.class, ConfigMapper.create(),
                SettingsService.VALIDATOR), AccessPolicy.loopbackOnly());
    }

    @Test
    @DisplayName("without a file the configured fallback applies")
    void fallback() {
        SettingsService s = service();
        assertThat(s.policy().mode()).isEqualTo(AccessMode.LOOPBACK);
        assertThat(s.current().locale()).isEqualTo("en");
    }

    @Test
    @DisplayName("saved settings change the policy at once and survive a restart")
    void saves() throws Exception {
        service().save(new OrbitSettings(null, new OrbitSettings.Access("lan", List.of(), true), "pt-BR", null, null,
                24, null, null), "Ana");

        SettingsService reloaded = service();
        assertThat(reloaded.policy().canMutate(InetAddress.getByName("192.168.0.5"))).isTrue();
        assertThat(reloaded.current().locale()).isEqualTo("pt-BR");
        assertThat(reloaded.current().updatedBy()).isEqualTo("Ana");
    }

    @Test
    @DisplayName("CIDR mode keeps its ranges")
    void cidr() throws Exception {
        SettingsService s = service();
        s.save(new OrbitSettings(null, new OrbitSettings.Access("cidr", List.of("10.0.5.0/24"), false), null, null, null,
                null, null, null), "Ana");
        assertThat(s.policy().canMutate(InetAddress.getByName("10.0.5.9"))).isTrue();
        assertThat(s.policy().lanAcknowledge()).isFalse();
    }

    @Test
    @DisplayName("invalid values are rejected")
    void invalid() {
        assertThatThrownBy(() -> service().save(new OrbitSettings(null, new OrbitSettings.Access("everyone", List.of(),
                true), null, null, null, null, null, null), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service().save(new OrbitSettings(null, null, "fr", null, null, null, null, null), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> service().save(new OrbitSettings(null, new OrbitSettings.Access("cidr", List.of(), true),
                null, null, null, null, null, null), "Ana")).isInstanceOf(ConfigValidationException.class);
    }
}
