package io.orbit.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CORE-19 health of every config file")
class ConfigHealthTest {

    @TempDir
    Path dir;

    private ConfigHealth.FileHealth of(List<ConfigHealth.FileHealth> report, String file) {
        return report.stream().filter(h -> h.file().equals(file)).findFirst().orElseThrow();
    }

    @Test
    @DisplayName("missing files are 'missing', valid ones 'ok' with their item count, broken ones 'invalid'")
    void report() throws Exception {
        Files.writeString(dir.resolve("orbit.groups.json"), "{\"version\":1,\"items\":[{\"id\":\"grp_a\",\"name\":\"A\"}]}");
        Files.writeString(dir.resolve("orbit.themes.json"), "{\"version\":1,\"items\":[{\"id\":7}]}");
        Files.writeString(dir.resolve("orbit.layouts.json"), "not json 4111 1111 1111 1111");

        List<ConfigHealth.FileHealth> report = new ConfigHealth(dir).report();

        assertThat(report).extracting(ConfigHealth.FileHealth::file)
                .contains("orbit.settings.json", "orbit.customization.json", "orbit.terminology.json");
        assertThat(of(report, "orbit.settings.json").state()).isEqualTo("missing");
        assertThat(of(report, "orbit.groups.json")).satisfies(h -> {
            assertThat(h.state()).isEqualTo("ok");
            assertThat(h.items()).isEqualTo(1);
        });
        assertThat(of(report, "orbit.themes.json").state()).isEqualTo("invalid");
        assertThat(of(report, "orbit.themes.json").error()).contains("$.items[0].id");
        assertThat(of(report, "orbit.layouts.json").state()).isEqualTo("invalid");
        assertThat(of(report, "orbit.layouts.json").error()).doesNotContain("4111");
    }

    @Test
    @DisplayName("an error reported by the owner of a loaded file marks it invalid")
    void ownerErrors() throws Exception {
        Files.writeString(dir.resolve("orbit.groups.json"), "{\"version\":1,\"items\":[{\"id\":\"grp_a\",\"name\":\"A\"}]}");
        ConfigFile<TestItem> groups = new ConfigFile<>(dir, "groups", TestItem.class, ConfigMapper.create(),
                items -> List.of("grp_a: domain rule broken"));

        List<ConfigHealth.FileHealth> report = new ConfigHealth(dir, List.of(groups)).report();

        assertThat(of(report, "orbit.groups.json").state()).isEqualTo("invalid");
        assertThat(of(report, "orbit.groups.json").error()).contains("domain rule broken");
    }

    record TestItem(String id, String name) implements ConfigItem {
    }
}
