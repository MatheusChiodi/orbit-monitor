package io.orbit.config;

import io.orbit.common.privacy.SensitiveDataRedactor;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/** docs/06 section 6: example files must never contain real-looking secrets, card numbers or CPFs. */
class ConfigExamplesTest {

    private static final Path EXAMPLES = Path.of("..", "config-examples");

    private static List<Path> examples() throws IOException {
        try (Stream<Path> files = Files.list(EXAMPLES)) {
            return files.filter(p -> p.getFileName().toString().endsWith(".json")).toList();
        }
    }

    @Test
    void examplesExistAndFollowTheNamingRule() throws IOException {
        assertThat(examples()).isNotEmpty().allSatisfy(p -> assertThat(p.getFileName().toString())
                .matches("orbit\\.[a-z0-9-]+\\.(example|schema)\\.json"));
    }

    @Test
    void examplesContainNothingTheRedactorWouldMask() throws IOException {
        SensitiveDataRedactor redactor = new SensitiveDataRedactor();
        for (Path example : examples()) {
            String content = Files.readString(example);
            assertThat(redactor.redactText(content)).as(example.toString()).isEqualTo(content);
        }
    }

    @Test
    void secretsInExamplesAreEnvironmentReferencesOnly() throws IOException {
        for (Path example : examples()) {
            String content = Files.readString(example);
            assertThat(content).as(example.toString()).doesNotContain("\"enc\"");
        }
    }

    @Test
    void examplesAreValidVersionedDocuments() throws IOException {
        var mapper = ConfigMapper.create();
        for (Path example : examples()) {
            if (example.getFileName().toString().endsWith(".example.json")) {
                var tree = mapper.readTree(example.toFile());
                assertThat(tree.path("version").asInt()).as(example.toString()).isEqualTo(ConfigFile.CURRENT_VERSION);
                assertThat(tree.path("items").isArray()).as(example.toString()).isTrue();
            }
        }
    }
}
