package io.orbit.workspace.customization;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.config.ConfigValidationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-51 orbit.terminology.json store (custom labels per locale)")
class TerminologyServiceTest {

    @TempDir
    Path dir;

    private TerminologyService service() {
        return new TerminologyService(new ConfigFile<>(dir, "terminology", TerminologyService.Terms.class,
                ConfigMapper.create(), TerminologyService.VALIDATOR));
    }

    @Test
    @DisplayName("terms are stored per locale and survive a restart")
    void perLocale() {
        service().save("pt-BR", Map.of("status.DOWN", "Fora do ar", "incident.acknowledge", "Estou nisso"), "Ana");
        service().save("en", Map.of("status.DOWN", "Offline"), "Ana");

        TerminologyService reloaded = service();
        assertThat(reloaded.terms("pt-BR")).containsEntry("status.DOWN", "Fora do ar");
        assertThat(reloaded.terms("en")).containsOnly(Map.entry("status.DOWN", "Offline"));
        assertThat(reloaded.list()).extracting(TerminologyService.Terms::id).containsExactly("en", "pt-BR");
        assertThat(reloaded.find("en")).hasValueSatisfying(t -> assertThat(t.updatedBy()).isEqualTo("Ana"));
    }

    @Test
    @DisplayName("an unknown locale is empty; delete resets it")
    void reset() {
        TerminologyService s = service();
        assertThat(s.terms("en")).isEmpty();
        s.save("en", Map.of("status.DOWN", "Offline"), "Ana");
        assertThat(s.delete("en")).isTrue();
        assertThat(s.terms("en")).isEmpty();
    }

    @Test
    @DisplayName("locales, keys and texts are validated; markup is refused")
    void validation() {
        TerminologyService s = service();
        assertThatThrownBy(() -> s.save("fr", Map.of("status.DOWN", "Hors ligne"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("en", Map.of("bad key!", "x"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("en", Map.of("status.DOWN", " "), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("en", Map.of("status.DOWN", "<img src=x onerror=alert(1)>"), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
        assertThatThrownBy(() -> s.save("en", Map.of("status.DOWN", "x".repeat(121)), "Ana"))
                .isInstanceOf(ConfigValidationException.class);
    }
}
