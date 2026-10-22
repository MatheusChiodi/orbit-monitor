package io.orbit.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConfigFileTest {

    record Group(String id, String name, String color) implements ConfigItem {
    }

    @TempDir
    Path dir;

    private ConfigFile<Group> groups() {
        return new ConfigFile<>(dir, "groups", Group.class, ConfigMapper.create(), items -> {
            List<String> errors = new ArrayList<>();
            items.stream().filter(g -> g.name() == null || g.name().isBlank())
                    .forEach(g -> errors.add(g.id() + ": name is required"));
            return errors;
        });
    }

    @Test
    void missingFileMeansNoItemsAndIsNotCreatedUntilSaved() {
        ConfigFile<Group> file = groups();

        assertThat(file.items()).isEmpty();
        assertThat(Files.exists(dir.resolve("orbit.groups.json"))).isFalse();
        assertThat(file.path().getFileName().toString()).isEqualTo("orbit.groups.json");
    }

    @Test
    void savesVersionedDocumentAndReadsItBack() throws IOException {
        groups().save(List.of(new Group("grp_payments", "Payments", "#3b9eff")));

        String json = Files.readString(dir.resolve("orbit.groups.json"));
        assertThat(json).contains("\"version\" : 1", "\"items\"", "\"grp_payments\"");
        assertThat(groups().items()).containsExactly(new Group("grp_payments", "Payments", "#3b9eff"));
    }

    @Test
    void refusesToStoreCardNumbers() throws IOException {
        // Public test card number (never a real card).
        String testPan = "4111 1111 1111 1111";

        assertThatThrownBy(() -> groups().save(List.of(new Group("g1", "Order 7 " + testPan, null))))
                .isInstanceOf(ConfigValidationException.class)
                .hasMessageContaining("card number")
                .hasMessageNotContaining(testPan);
        assertThat(Files.exists(dir.resolve("orbit.groups.json"))).isFalse();

        Files.writeString(dir.resolve("orbit.groups.json"),
                "{\"version\":1,\"items\":[{\"id\":\"g1\",\"name\":\"" + testPan + "\"}]}");
        ConfigFile<Group> edited = groups();
        assertThat(edited.items()).isEmpty();
        assertThat(edited.lastError()).hasValueSatisfying(e -> assertThat(e).contains("card number")
                .doesNotContain(testPan));
    }

    @Test
    void keepsPreviousVersionAsBak() throws IOException {
        ConfigFile<Group> file = groups();
        file.save(List.of(new Group("g1", "One", null)));
        file.save(List.of(new Group("g1", "Uno", null)));

        assertThat(Files.readString(dir.resolve("orbit.groups.json.bak"))).contains("\"One\"");
        assertThat(Files.exists(dir.resolve("orbit.groups.json.tmp"))).isFalse();
    }

    @Test
    void rejectsInvalidItemsWithoutWriting() {
        ConfigFile<Group> file = groups();

        assertThatThrownBy(() -> file.save(List.of(new Group("g1", " ", null))))
                .isInstanceOfSatisfying(ConfigValidationException.class,
                        e -> assertThat(e.errors()).containsExactly("g1: name is required"));
        assertThat(Files.exists(file.path())).isFalse();
    }

    @Test
    void rejectsMissingAndDuplicateIds() {
        ConfigFile<Group> file = groups();
        assertThatThrownBy(() -> file.save(List.of(new Group(null, "A", null))))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> file.save(List.of(new Group("g", "A", null), new Group("g", "B", null))))
                .isInstanceOfSatisfying(ConfigValidationException.class,
                        e -> assertThat(e.errors()).anyMatch(m -> m.contains("duplicate id")));
    }

    @Test
    void reloadsExternalEditsAfterValidation() throws IOException {
        ConfigFile<Group> file = groups();
        file.save(List.of(new Group("g1", "One", null)));
        writeExternally("{\"version\":1,\"items\":[{\"id\":\"g1\",\"name\":\"Edited\"}]}");

        assertThat(file.reloadIfChanged()).isTrue();
        assertThat(file.items()).extracting(Group::name).containsExactly("Edited");
        assertThat(file.reloadIfChanged()).isFalse();
    }

    @Test
    void invalidExternalEditKeepsLastValidCopyAndReportsError() throws IOException {
        ConfigFile<Group> file = groups();
        file.save(List.of(new Group("g1", "One", null)));
        writeExternally("{ not json");

        assertThat(file.reloadIfChanged()).isFalse();
        assertThat(file.items()).extracting(Group::name).containsExactly("One");
        assertThat(file.lastError()).isPresent();
        assertThat(Files.readString(file.path())).isEqualTo("{ not json");
    }

    @Test
    void unsupportedVersionIsAnError() throws IOException {
        Files.writeString(dir.resolve("orbit.groups.json"), "{\"version\":99,\"items\":[]}");
        ConfigFile<Group> file = groups();
        assertThat(file.items()).isEmpty();
        assertThat(file.lastError()).hasValueSatisfying(e -> assertThat(e).contains("version"));
    }

    @Test
    void unknownFieldsAreIgnoredForForwardCompatibility() throws IOException {
        Files.writeString(dir.resolve("orbit.groups.json"),
                "{\"version\":1,\"items\":[{\"id\":\"g\",\"name\":\"N\",\"futureField\":true}]}");
        assertThat(groups().items()).extracting(Group::id).containsExactly("g");
    }

    @Test
    void featureNameIsValidated() {
        assertThatThrownBy(() -> new ConfigFile<>(dir, "../evil", Group.class, ConfigMapper.create(), i -> List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private void writeExternally(String content) throws IOException {
        Path path = dir.resolve("orbit.groups.json");
        Files.writeString(path, content);
        Files.setLastModifiedTime(path, FileTime.from(Instant.now().plusSeconds(5)));
    }
}
