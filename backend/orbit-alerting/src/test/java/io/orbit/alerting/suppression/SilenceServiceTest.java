package io.orbit.alerting.suppression;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("pending")
@DisplayName("BE-32 silence/snooze")
class SilenceServiceTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");

    @TempDir
    Path dir;

    private SilenceService service(Instant now) {
        return new SilenceService(new ConfigFile<>(dir, "silences", SilenceService.Silence.class, ConfigMapper.create(),
                items -> List.of()), Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("silences until the expiry, with reason and operator")
    void silences() {
        SilenceService.Silence s = service(T0).silence("sel_queue", "Known batch delay", "Ana", T0.plus(Duration.ofHours(2)));

        assertThat(s.createdBy()).isEqualTo("Ana");
        assertThat(service(T0.plusSeconds(60)).isSilenced("sel_queue")).isTrue();
        assertThat(service(T0.plus(Duration.ofHours(3))).isSilenced("sel_queue")).isFalse();
        assertThat(service(T0.plus(Duration.ofHours(3))).active()).isEmpty();
    }

    @Test
    @DisplayName("a reason, an operator and a future expiry are required")
    void validates() {
        assertThatThrownBy(() -> service(T0).silence("m", " ", "Ana", T0.plusSeconds(60)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service(T0).silence("m", "why", "Ana", T0.minusSeconds(60)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("a silence can be lifted early")
    void lift() {
        SilenceService.Silence s = service(T0).silence("m", "why", "Ana", T0.plus(Duration.ofHours(1)));
        assertThat(service(T0).lift(s.id(), "Bia")).isTrue();
        assertThat(service(T0).isSilenced("m")).isFalse();
    }
}
