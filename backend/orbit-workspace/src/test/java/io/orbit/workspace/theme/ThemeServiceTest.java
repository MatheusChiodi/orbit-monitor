package io.orbit.workspace.theme;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

@Tag("pending")
@DisplayName("BE-40 workspace defaults and themes API")
class ThemeServiceTest {

    private static Map<String, String> tokens(String text, String down) {
        return Map.of("--bg", "#07090d", "--s1", "#0d1117", "--text", text, "--muted", "#8b96a6",
                "--ok", "#22c55e", "--warn", "#f5a524", "--down", down, "--info", "#3b9eff");
    }

    @Test
    @DisplayName("contrast follows WCAG")
    void contrast() {
        assertThat(ThemeService.contrast("#000000", "#ffffff")).isCloseTo(21.0, within(0.01));
        assertThat(ThemeService.contrast("#ffffff", "#ffffff")).isCloseTo(1.0, within(0.01));
    }

    @Test
    @DisplayName("the default dark tokens pass")
    void defaultsPass() {
        assertThat(ThemeService.validate(new ThemeService.Theme("thm_dark", "Dark", tokens("#eef2f7", "#ff3b4f"))))
                .isEmpty();
    }

    @Test
    @DisplayName("low-contrast text and invalid colors are rejected")
    void rejects() {
        assertThat(ThemeService.validate(new ThemeService.Theme("thm_bad", "Bad", tokens("#1a1f26", "#ff3b4f"))))
                .anyMatch(e -> e.contains("--text"));
        assertThat(ThemeService.validate(new ThemeService.Theme("thm_bad2", "Bad", tokens("#eef2f7", "red"))))
                .anyMatch(e -> e.contains("--down"));
    }

    @Test
    @DisplayName("built-in defaults")
    void builtIn() {
        ThemeService.Defaults d = ThemeService.builtInDefaults();
        assertThat(d.locale()).isEqualTo("en");
        assertThat(d.scale()).isEqualTo(1.0);
    }
}
