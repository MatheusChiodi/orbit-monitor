package io.orbit.alerting;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-45 operator name anonymization in incidents")
class IncidentAnonymizationTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");

    @Test
    @DisplayName("acknowledgements, comments and tickets lose the operator name")
    void anonymizes() {
        IncidentService service = new IncidentService(new InMemoryIncidentRepository(), id -> false, i -> { },
                Clock.fixed(T0, ZoneOffset.UTC), Duration.ofMinutes(5));
        service.onStateChanged(new MonitorStateChanged("m", MonitorState.OK, MonitorState.DOWN, T0, T0));
        String id = service.openIncident("m").orElseThrow().id();
        service.acknowledge(id, "Ana Silva");
        service.comment(id, "Ana Silva", "restarting");
        service.comment(id, "Bia", "ok");

        int changed = service.anonymize("Ana Silva");

        Incident incident = service.find(id).orElseThrow();
        assertThat(changed).isEqualTo(1);
        assertThat(incident.acknowledgedBy()).isEqualTo("anonymized");
        assertThat(incident.events()).extracting(IncidentEvent::actor).doesNotContain("Ana Silva").contains("Bia");
    }
}
