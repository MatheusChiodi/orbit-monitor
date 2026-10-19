package io.orbit.alerting.report;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-34 postmortem report")
class PostmortemReportTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private Instant now = T0;
    private final Clock clock = new Clock() {
        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    };

    private Incident resolvedIncident(String monitor, int ackAfterMin, int resolveAfterMin) {
        IncidentService service = new IncidentService(new InMemoryIncidentRepository(), id -> false, i -> { }, clock,
                Duration.ofMinutes(5));
        service.onStateChanged(new MonitorStateChanged(monitor, MonitorState.OK, MonitorState.DOWN, T0, T0));
        String id = service.openIncident(monitor).orElseThrow().id();
        now = T0.plus(Duration.ofMinutes(ackAfterMin));
        service.acknowledge(id, "Ana");
        Instant resolved = T0.plus(Duration.ofMinutes(resolveAfterMin));
        service.onStateChanged(new MonitorStateChanged(monitor, MonitorState.DOWN, MonitorState.OK, resolved, resolved));
        return service.find(id).orElseThrow();
    }

    @Test
    @DisplayName("report carries MTTA, MTTR, who acknowledged and the timeline")
    void report() {
        PostmortemReport r = PostmortemReport.of(resolvedIncident("m", 4, 30));
        assertThat(r.timeToAcknowledge()).isEqualTo(Duration.ofMinutes(4));
        assertThat(r.timeToResolve()).isEqualTo(Duration.ofMinutes(30));
        assertThat(r.acknowledgedBy()).isEqualTo("Ana");
        assertThat(r.timeline()).hasSize(3);
    }

    @Test
    @DisplayName("summary averages over incidents")
    void summary() {
        PostmortemReport.Summary s = PostmortemReport.summarize(List.of(resolvedIncident("a", 2, 10),
                resolvedIncident("b", 6, 30)));
        assertThat(s.incidents()).isEqualTo(2);
        assertThat(s.meanTimeToAcknowledge()).isEqualTo(Duration.ofMinutes(4));
        assertThat(s.meanTimeToResolve()).isEqualTo(Duration.ofMinutes(20));
    }
}
