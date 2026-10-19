package io.orbit.alerting.oncall;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-33 on-call schedules")
class OnCallScheduleTest {

    private static final Instant T0 = Instant.parse("2026-10-12T12:00:00Z");
    private final OnCallSchedule weekly = new OnCallSchedule("onc_payments", "Payments", List.of("Ana", "Bia", "Caio"),
            T0, Duration.ofDays(7), List.of());

    @Test
    @DisplayName("rotates weekly and wraps around")
    void rotates() {
        assertThat(weekly.onCall(T0.plus(Duration.ofDays(1)))).contains("Ana");
        assertThat(weekly.onCall(T0.plus(Duration.ofDays(8)))).contains("Bia");
        assertThat(weekly.onCall(T0.plus(Duration.ofDays(22)))).contains("Ana");
        assertThat(weekly.shiftEndsAt(T0.plus(Duration.ofDays(1)))).contains(T0.plus(Duration.ofDays(7)));
    }

    @Test
    @DisplayName("an override replaces the rotation for its period")
    void override() {
        OnCallSchedule withOverride = new OnCallSchedule("o", "P", List.of("Ana", "Bia"), T0, Duration.ofDays(7),
                List.of(new OnCallSchedule.Override("Dani", T0.plus(Duration.ofDays(2)), T0.plus(Duration.ofDays(3)))));
        assertThat(withOverride.onCall(T0.plus(Duration.ofDays(2)).plusSeconds(60))).contains("Dani");
        assertThat(withOverride.onCall(T0.plus(Duration.ofDays(4)))).contains("Ana");
    }

    @Test
    @DisplayName("nobody before the start")
    void beforeStart() {
        assertThat(weekly.onCall(T0.minusSeconds(1))).isEmpty();
    }
}
