package io.orbit.alerting.suppression;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-31 maintenance windows")
class MaintenanceWindowTest {

    private static final ZoneId SP = ZoneId.of("America/Sao_Paulo");

    @Test
    @DisplayName("a one-off window is active between start and end")
    void oneOff() {
        var w = new MaintenanceWindow("mnt_1", "DB patch", List.of("grp_core"), Instant.parse("2026-10-18T03:00:00Z"),
                Instant.parse("2026-10-18T05:00:00Z"), null, null, SP, "Oracle patch");
        assertThat(w.isActive(Instant.parse("2026-10-18T04:00:00Z"))).isTrue();
        assertThat(w.isActive(Instant.parse("2026-10-18T05:00:00Z"))).isFalse();
        assertThat(w.covers("grp_core", Instant.parse("2026-10-18T04:00:00Z"))).isTrue();
        assertThat(w.covers("grp_other", Instant.parse("2026-10-18T04:00:00Z"))).isFalse();
    }

    @Test
    @DisplayName("a recurring window follows its cron in its timezone")
    void recurring() {
        // every Sunday at 02:00 São Paulo for 2 hours
        var w = new MaintenanceWindow("mnt_2", "Weekly", List.of("sel_queue"), null, null, "0 2 * * SUN",
                Duration.ofHours(2), SP, "Weekly batch");
        assertThat(w.isActive(Instant.parse("2026-10-18T06:00:00Z"))).isTrue(); // Sunday 03:00 local
        assertThat(w.isActive(Instant.parse("2026-10-18T08:30:00Z"))).isFalse(); // Sunday 05:30 local
        assertThat(w.isActive(Instant.parse("2026-10-19T06:00:00Z"))).isFalse(); // Monday
    }
}
