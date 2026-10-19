package io.orbit.alerting.escalation;

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
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-27 escalation policies")
class EscalationPolicyTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final EscalationPolicy policy = new EscalationPolicy("esc_payments", "Payments", List.of(
            new EscalationPolicy.Step(Duration.ZERO, List.of("chn_team")),
            new EscalationPolicy.Step(Duration.ofMinutes(15), List.of("chn_manager")),
            new EscalationPolicy.Step(Duration.ofMinutes(30), List.of("chn_directors"))));

    private Incident open(boolean acknowledged) {
        IncidentService service = new IncidentService(new InMemoryIncidentRepository(), id -> false, i -> { },
                Clock.fixed(T0.plusSeconds(60), ZoneOffset.UTC), Duration.ofMinutes(5));
        service.onStateChanged(new MonitorStateChanged("m", MonitorState.OK, MonitorState.DOWN, T0, T0));
        Incident incident = service.openIncident("m").orElseThrow();
        return acknowledged ? service.acknowledge(incident.id(), "Ana") : incident;
    }

    @Test
    @DisplayName("steps fire by elapsed time and are sent once")
    void stepsByTime() {
        Incident incident = open(false);
        assertThat(policy.due(incident, T0, List.of())).extracting(EscalationPolicy.Step::channelIds)
                .containsExactly(List.of("chn_team"));
        assertThat(policy.due(incident, T0.plus(Duration.ofMinutes(16)), List.of(0)))
                .extracting(EscalationPolicy.Step::channelIds).containsExactly(List.of("chn_manager"));
        assertThat(policy.nextEscalationAt(incident, List.of(0, 1))).contains(T0.plus(Duration.ofMinutes(30)));
    }

    @Test
    @DisplayName("acknowledging stops the escalation")
    void stopsOnAcknowledge() {
        Incident incident = open(true);
        assertThat(policy.due(incident, T0.plus(Duration.ofHours(1)), List.of(0))).isEmpty();
        assertThat(policy.nextEscalationAt(incident, List.of(0))).isEmpty();
    }
}
