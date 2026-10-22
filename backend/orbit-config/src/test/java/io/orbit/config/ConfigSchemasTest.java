package io.orbit.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CORE-19 JSON Schema per config file")
class ConfigSchemasTest {

    @Test
    @DisplayName("the core features have schemas")
    void schemasExist() {
        assertThat(ConfigSchemas.features()).contains("settings", "connections", "requests", "selects", "groups",
                "query-catalog", "layouts", "channels", "escalation", "maintenance", "silences", "themes", "variables",
                "status-pages", "workspaces", "customization", "terminology");
    }

    @Test
    @DisplayName("every example file is valid against its schema")
    void examplesValidate() throws Exception {
        try (var files = Files.list(Path.of("..", "config-examples"))) {
            for (Path example : files.filter(p -> p.toString().endsWith(".example.json")).toList()) {
                String feature = example.getFileName().toString().replace("orbit.", "").replace(".example.json", "");
                assertThat(ConfigSchemas.validate(feature, Files.readString(example))).as(feature).isEmpty();
            }
        }
    }

    @Test
    @DisplayName("plain-text passwords and wrong types are violations")
    void violations() {
        assertThat(ConfigSchemas.validate("connections",
                "{\"version\":1,\"items\":[{\"id\":\"c\",\"name\":\"C\",\"jdbcUrl\":\"jdbc:h2:mem:x\",\"username\":\"u\","
                        + "\"password\":\"hunter2\",\"poolSize\":2}]}")).isNotEmpty();
        assertThat(ConfigSchemas.validate("groups", "{\"version\":1,\"items\":[{\"id\":\"g\",\"name\":7}]}")).isNotEmpty();
        assertThat(ConfigSchemas.validate("groups", "{\"items\":[]}")).isNotEmpty();
    }
}
