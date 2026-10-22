package io.orbit.alerting.suppression;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-31 maintenance schedule: silencing, uptime exclusion and calendar")
class MaintenanceScheduleTest {

    private final MaintenanceSchedule schedule = new MaintenanceSchedule(() -> List.of(
            new MaintenanceWindow("mnt_patch", "DB patch", List.of("grp_core"), Instant.parse("2026-10-18T03:00:00Z"),
                    Instant.parse("2026-10-18T05:00:00Z"), null, null, null, "Oracle patch"),
            new MaintenanceWindow("mnt_nightly", "Nightly", List.of("sel_queue"), null, null, "0 1 * * *",
                    Duration.ofMinutes(30), ZoneId.of("UTC"), "Batch")));

    @Test
    @DisplayName("a monitor is in maintenance through its own id or its group")
    void inMaintenance() {
        Instant at = Instant.parse("2026-10-18T04:00:00Z");
        assertThat(schedule.inMaintenance(List.of("sel_x", "grp_core"), at)).isTrue();
        assertThat(schedule.inMaintenance(List.of("sel_x", "grp_web"), at)).isFalse();
    }

    @Test
    @DisplayName("exclusions only cover the windows of the given targets")
    void exclusions() {
        var ranges = schedule.exclusions(List.of("sel_queue", "grp_web"), Instant.parse("2026-10-17T12:00:00Z"),
                Instant.parse("2026-10-18T12:00:00Z"));
        assertThat(ranges).containsExactly(new MaintenanceWindow.Occurrence(Instant.parse("2026-10-18T01:00:00Z"),
                Instant.parse("2026-10-18T01:30:00Z")));
        assertThat(MaintenanceSchedule.within(ranges, Instant.parse("2026-10-18T01:10:00Z"))).isTrue();
    }

    @Test
    @DisplayName("the calendar lists every occurrence by start")
    void calendar() {
        assertThat(schedule.occurrences(Instant.parse("2026-10-18T00:00:00Z"), Instant.parse("2026-10-19T00:00:00Z")))
                .extracting(MaintenanceSchedule.Scheduled::windowId).containsExactly("mnt_nightly", "mnt_patch");
    }
}
