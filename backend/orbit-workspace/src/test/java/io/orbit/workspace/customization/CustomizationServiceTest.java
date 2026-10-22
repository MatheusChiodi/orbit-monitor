package io.orbit.workspace.customization;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-51 orbit.customization.json store (CORE-21 workspace, layout and instance scopes, profiles)")
class CustomizationServiceTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @TempDir
    Path dir;

    private CustomizationService service() {
        return new CustomizationService(new ConfigFile<>(dir, "customization", CustomizationService.Entry.class,
                ConfigMapper.create(), CustomizationService.VALIDATOR));
    }

    private static Map<String, JsonNode> values(Object... pairs) {
        Map<String, JsonNode> map = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put((String) pairs[i], JSON.valueToTree(pairs[i + 1]));
        }
        return map;
    }

    @Test
    @DisplayName("each scope is stored once and survives a restart")
    void scopes() {
        CustomizationService s = service();
        s.save("workspace", null, null, values("card.monitor.clickAction", "expand", "wall.rotationSeconds", 30), "Ana");
        CustomizationService.Entry layout = s.save("layout", "noc", null, values("card.monitor.clickAction", "none"),
                "Ana");

        assertThat(layout.id()).isEqualTo("layout:noc");
        assertThat(layout.updatedBy()).isEqualTo("Ana");
        assertThat(service().list()).extracting(CustomizationService.Entry::id)
                .containsExactly("workspace", "layout:noc");
    }

    @Test
    @DisplayName("resolve applies workspace < layout < instance")
    void precedence() {
        CustomizationService s = service();
        s.save("workspace", null, null, values("a.one", 1, "a.two", 1, "a.three", 1), "Ana");
        s.save("layout", "noc", null, values("a.two", 2, "a.three", 2), "Ana");
        s.save("instance", "card-sel_queue", null, values("a.three", 3), "Ana");

        Map<String, JsonNode> effective = s.resolve("noc", "card-sel_queue");
        assertThat(effective.get("a.one").asInt()).isEqualTo(1);
        assertThat(effective.get("a.two").asInt()).isEqualTo(2);
        assertThat(effective.get("a.three").asInt()).isEqualTo(3);
        assertThat(s.resolve(null, null).get("a.three").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("profiles need a name and export without secrets or ids of the file")
    void profiles() {
        CustomizationService s = service();
        assertThatThrownBy(() -> s.save("profile", "night", null, values("a.one", 1), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        s.save("profile", "night", "Night shift", values("wall.dim", true), "Ana");

        CustomizationService.ProfileFile exported = s.exportProfile("night").orElseThrow();
        assertThat(exported.format()).isEqualTo(CustomizationService.PROFILE_FORMAT);
        assertThat(exported.name()).isEqualTo("Night shift");
        assertThat(exported.values().get("wall.dim").asBoolean()).isTrue();

        CustomizationService.Entry imported = s.importProfile("night-copy", exported, "Bia");
        assertThat(imported.id()).isEqualTo("profile:night-copy");
        assertThat(imported.values()).containsKey("wall.dim");
    }

    @Test
    @DisplayName("safety guarantees and secrets cannot be customized")
    void safety() {
        CustomizationService s = service();
        assertThatThrownBy(() -> s.save("workspace", null, null, values("privacy.showFullPan", true), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("workspace", null, null, values("access.editFrom", "lan"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("workspace", null, null, values("a.token", Map.of("enc", "v1:abc")), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("workspace", null, null, values("a.token", "${env:SECRET}"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("scopes, targets, setting ids and value sizes are validated")
    void validation() {
        CustomizationService s = service();
        assertThatThrownBy(() -> s.save("device", "tv", null, values("a.one", 1), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("layout", null, null, values("a.one", 1), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("workspace", null, null, values("bad id!", 1), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("workspace", null, null, values("a.big", "x".repeat(5_000)), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }

    @Test
    @DisplayName("delete resets a scope")
    void delete() {
        CustomizationService s = service();
        s.save("layout", "noc", null, values("a.one", 1), "Ana");
        assertThat(s.delete("layout", "noc")).isTrue();
        assertThat(s.delete("layout", "noc")).isFalse();
    }
}
