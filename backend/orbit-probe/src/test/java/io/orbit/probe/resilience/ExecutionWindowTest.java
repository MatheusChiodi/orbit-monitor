package io.orbit.probe.resilience;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-17 execution windows")
class ExecutionWindowTest {

    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    private final ExecutionWindow businessHours = new ExecutionWindow(
            EnumSet.range(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), LocalTime.of(8, 0), LocalTime.of(18, 0), SAO_PAULO);

    @Test
    @DisplayName("open on weekdays inside business hours in the window's timezone")
    void businessHours() {
        // Monday 2026-10-19 10:00 in São Paulo is 13:00 UTC
        assertThat(businessHours.isOpen(Instant.parse("2026-10-19T13:00:00Z"))).isTrue();
        // Monday 07:30 local
        assertThat(businessHours.isOpen(Instant.parse("2026-10-19T10:30:00Z"))).isFalse();
        // Saturday 10:00 local
        assertThat(businessHours.isOpen(Instant.parse("2026-10-24T13:00:00Z"))).isFalse();
    }

    @Test
    @DisplayName("the end is exclusive")
    void endExclusive() {
        assertThat(businessHours.isOpen(Instant.parse("2026-10-19T21:00:00Z"))).isFalse();
    }

    @Test
    @DisplayName("a window across midnight")
    void overnight() {
        ExecutionWindow night = new ExecutionWindow(EnumSet.allOf(DayOfWeek.class), LocalTime.of(22, 0),
                LocalTime.of(6, 0), ZoneId.of("UTC"));
        assertThat(night.isOpen(Instant.parse("2026-10-19T23:30:00Z"))).isTrue();
        assertThat(night.isOpen(Instant.parse("2026-10-19T05:59:00Z"))).isTrue();
        assertThat(night.isOpen(Instant.parse("2026-10-19T12:00:00Z"))).isFalse();
    }
}
