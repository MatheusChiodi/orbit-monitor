package io.orbit.security.settings;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import io.orbit.security.access.AccessPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("FE-10 backend: workspace branding in orbit.settings.json")
class SettingsBrandingTest {

    @TempDir
    Path dir;

    private SettingsService service() {
        return new SettingsService(new ConfigFile<>(dir, "settings", OrbitSettings.class, ConfigMapper.create(),
                SettingsService.VALIDATOR), AccessPolicy.loopbackOnly());
    }

    private static OrbitSettings withBranding(OrbitSettings.Branding branding) {
        return new OrbitSettings(null, null, "en", null, null, null, null, 24, null, null, branding);
    }

    @Test
    @DisplayName("the logo is sanitized before it is written")
    void sanitizedOnSave() throws Exception {
        service().save(withBranding(new OrbitSettings.Branding("Acme NOC",
                "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"x()\"><script>x()</script><rect/></svg>")), "Ana");

        OrbitSettings saved = service().current();
        assertThat(saved.branding().name()).isEqualTo("Acme NOC");
        assertThat(saved.branding().logoSvg()).contains("<rect").doesNotContain("script", "onload");
        assertThat(Files.readString(dir.resolve("orbit.settings.json"))).doesNotContain("script");
    }

    @Test
    @DisplayName("a long name or a broken logo is rejected")
    void validates() {
        assertThatThrownBy(() -> service().save(withBranding(new OrbitSettings.Branding("x".repeat(81), null)), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("branding.name");
        assertThatThrownBy(() -> service().save(withBranding(new OrbitSettings.Branding("Acme", "<html/>")), "Ana"))
                .isInstanceOf(ConfigValidationException.class).hasMessageContaining("branding.logoSvg");
    }
}
