package io.orbit.workspace.theme;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-40 custom themes in orbit.themes.json with server-side contrast validation")
class ThemeStoreTest {

    @TempDir
    Path dir;

    static Map<String, String> colors() {
        Map<String, String> c = new HashMap<>();
        c.put("bg", "#07090d");
        c.put("s1", "#0d1117");
        c.put("s2", "#131922");
        c.put("s3", "#1a212c");
        c.put("line", "#ffffff14");
        c.put("line2", "#ffffff24");
        c.put("text", "#eef2f7");
        c.put("muted", "#8b96a6");
        c.put("dim", "#6b7686");
        c.put("ok", "#22c55e");
        c.put("warn", "#f5a524");
        c.put("down", "#ff3b4f");
        c.put("info", "#3b9eff");
        c.put("accent", "#3b9eff");
        return c;
    }

    static ThemeStore.CustomTheme theme(String id, Map<String, String> colors) {
        return new ThemeStore.CustomTheme(id, "My theme", "dark", "custom", colors,
                List.of("#3b9eff", "#22c55e", "#f5a524", "#ff3b4f", "#a78bfa", "#2dd4bf", "#f472b6", "#facc15"),
                Map.of("keyword", "#c792ea", "string", "#c3e88d", "number", "#f78c6c", "comment", "#6b7686",
                        "function", "#82aaff", "operator", "#89ddff", "identifier", "#eef2f7"),
                Map.of("from", "#3b9eff", "to", "#a78bfa", "glow", "#3b9eff"), "orbit-dark", null, null);
    }

    private ThemeStore store() {
        return new ThemeStore(new ConfigFile<>(dir, "themes", ThemeStore.CustomTheme.class, ConfigMapper.create(),
                ThemeStore.VALIDATOR));
    }

    @Test
    @DisplayName("a readable theme is saved with the operator and survives a restart")
    void saves() {
        ThemeStore.CustomTheme saved = store().save(theme("my-theme", colors()), "Ana");

        assertThat(saved.updatedBy()).isEqualTo("Ana");
        assertThat(store().list()).singleElement().satisfies(t -> {
            assertThat(t.id()).isEqualTo("my-theme");
            assertThat(t.colors()).containsEntry("text", "#eef2f7");
            assertThat(t.chart()).hasSize(8);
            assertThat(t.basedOn()).isEqualTo("orbit-dark");
        });
    }

    @Test
    @DisplayName("low contrast text and state colors are rejected, naming the pair and ratio")
    void contrast() {
        Map<String, String> low = colors();
        low.put("text", "#1a1f26");
        low.put("down", "#20262f");

        assertThatThrownBy(() -> store().save(theme("low", low), "Ana"))
                .isInstanceOf(ConfigValidationException.class)
                .satisfies(e -> assertThat(((ConfigValidationException) e).errors())
                        .anyMatch(m -> m.startsWith("text on bg"))
                        .anyMatch(m -> m.startsWith("down on s1")));
    }

    @Test
    @DisplayName("ids, missing tokens and non-hex colors are rejected")
    void shape() {
        Map<String, String> missing = colors();
        missing.remove("muted");
        Map<String, String> css = colors();
        css.put("accent", "url(javascript:alert(1))");

        assertThatThrownBy(() -> store().save(theme("Bad Id", colors()), "Ana")).isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> store().save(theme("missing", missing), "Ana"))
                .hasMessageContaining("muted");
        assertThatThrownBy(() -> store().save(theme("css", css), "Ana")).isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("delete")
    void delete() {
        ThemeStore s = store();
        s.save(theme("my-theme", colors()), "Ana");
        assertThat(s.delete("my-theme")).isTrue();
        assertThat(s.delete("my-theme")).isFalse();
        assertThat(s.find("my-theme")).isEmpty();
    }
}
