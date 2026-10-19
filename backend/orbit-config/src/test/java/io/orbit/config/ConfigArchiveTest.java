package io.orbit.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("pending")
@DisplayName("BE-37 config export/import")
class ConfigArchiveTest {

    @TempDir
    Path dir;

    @BeforeEach
    void files() throws Exception {
        Files.writeString(dir.resolve("orbit.groups.json"),
                "{\"version\":1,\"items\":[{\"id\":\"grp_a\",\"name\":\"A\"}]}");
        Files.writeString(dir.resolve("orbit.connections.json"),
                "{\"version\":1,\"items\":[{\"id\":\"con_a\",\"password\":{\"enc\":\"v1:c2VjcmV0\"}}]}");
        Files.writeString(dir.resolve("orbit.groups.json.bak"), "old");
    }

    private static Map<String, String> unzip(byte[] zip) throws Exception {
        Map<String, String> files = new HashMap<>();
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            for (ZipEntry e; (e = in.getNextEntry()) != null; ) {
                files.put(e.getName(), new String(in.readAllBytes(), StandardCharsets.UTF_8));
            }
        }
        return files;
    }

    private static byte[] zip(Map<String, String> files) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (var f : files.entrySet()) {
                zip.putNextEntry(new ZipEntry(f.getKey()));
                zip.write(f.getValue().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }

    @Test
    @DisplayName("export contains only config files and no secrets")
    void export() throws Exception {
        Map<String, String> files = unzip(new ConfigArchive(dir).export());
        assertThat(files).containsOnlyKeys("orbit.groups.json", "orbit.connections.json");
        assertThat(files.get("orbit.connections.json")).doesNotContain("v1:c2VjcmV0").contains("con_a");
    }

    @Test
    @DisplayName("dry run lists the changes and writes nothing")
    void dryRun() throws Exception {
        byte[] archive = zip(Map.of("orbit.groups.json",
                "{\"version\":1,\"items\":[{\"id\":\"grp_a\",\"name\":\"A2\"},{\"id\":\"grp_b\",\"name\":\"B\"}]}"));
        var changes = new ConfigArchive(dir).diff(archive);
        assertThat(changes).singleElement().satisfies(c -> {
            assertThat(c.added()).containsExactly("grp_b");
            assertThat(c.changed()).containsExactly("grp_a");
        });
        assertThat(Files.readString(dir.resolve("orbit.groups.json"))).doesNotContain("A2");
    }

    @Test
    @DisplayName("import keeps the current secret when the archive omits it")
    void keepsSecrets() throws Exception {
        byte[] archive = zip(Map.of("orbit.connections.json",
                "{\"version\":1,\"items\":[{\"id\":\"con_a\",\"password\":null,\"name\":\"renamed\"}]}"));
        new ConfigArchive(dir).apply(archive);
        assertThat(Files.readString(dir.resolve("orbit.connections.json"))).contains("v1:c2VjcmV0", "renamed");
    }

    @Test
    @DisplayName("entries outside the config naming rule are rejected")
    void rejectsTraversal() throws Exception {
        byte[] evil = zip(Map.of("../master.key", "x"));
        assertThatThrownBy(() -> new ConfigArchive(dir).apply(evil)).isInstanceOf(IllegalArgumentException.class);
    }
}
