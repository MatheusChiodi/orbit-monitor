package io.orbit.alerting.suppression;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

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

    @Test
    @DisplayName("occurrences inside a period: one-off clipped, recurring once per cron match")
    void occurrences() {
        var oneOff = new MaintenanceWindow("mnt_1", "DB patch", List.of("grp_core"),
                Instant.parse("2026-10-18T03:00:00Z"), Instant.parse("2026-10-18T05:00:00Z"), null, null, SP, null);
        assertThat(oneOff.occurrences(Instant.parse("2026-10-18T00:00:00Z"), Instant.parse("2026-10-19T00:00:00Z")))
                .containsExactly(new MaintenanceWindow.Occurrence(Instant.parse("2026-10-18T03:00:00Z"),
                        Instant.parse("2026-10-18T05:00:00Z")));
        assertThat(oneOff.occurrences(Instant.parse("2026-10-18T06:00:00Z"), Instant.parse("2026-10-19T00:00:00Z")))
                .isEmpty();

        var daily = new MaintenanceWindow("mnt_3", "Nightly", List.of("sel_queue"), null, null, "30 1 * * *",
                Duration.ofMinutes(30), ZoneId.of("UTC"), null);
        assertThat(daily.occurrences(Instant.parse("2026-10-18T01:45:00Z"), Instant.parse("2026-10-20T00:00:00Z")))
                .containsExactly(
                        new MaintenanceWindow.Occurrence(Instant.parse("2026-10-18T01:30:00Z"),
                                Instant.parse("2026-10-18T02:00:00Z")),
                        new MaintenanceWindow.Occurrence(Instant.parse("2026-10-19T01:30:00Z"),
                                Instant.parse("2026-10-19T02:00:00Z")));
    }

    @Test
    @DisplayName("validation explains what is missing")
    void validation() {
        assertThat(new MaintenanceWindow("a", "A", List.of(), null, null, null, null, null, null).problems())
                .contains("a: at least one target", "a: start and end, or cron and duration, are required");
        assertThat(new MaintenanceWindow("b", "B", List.of("m"), Instant.parse("2026-10-18T05:00:00Z"),
                Instant.parse("2026-10-18T03:00:00Z"), null, null, null, null).problems())
                .contains("b: end must be after start");
        assertThat(new MaintenanceWindow("c", "C", List.of("m"), null, null, "bad cron", Duration.ofHours(1), null,
                null).problems()).anyMatch(p -> p.startsWith("c: invalid cron"));
        assertThat(new MaintenanceWindow("d", "D", List.of("m"), null, null, "0 2 * * *", Duration.ofDays(2), null,
                null).problems()).contains("d: duration must be between 1 minute and 1 day");
        assertThat(new MaintenanceWindow("e", "E", List.of("m"), null, null, "0 2 * * *", Duration.ofHours(1), null,
                null).problems()).isEmpty();
    }
}
