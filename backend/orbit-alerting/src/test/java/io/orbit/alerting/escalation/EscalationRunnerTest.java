package io.orbit.alerting.escalation;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-27 escalation runs on a timer and stops on acknowledge")
class EscalationRunnerTest {

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

    private final List<String> sent = new ArrayList<>();
    private IncidentService incidents;
    private EscalationRunner runner;

    @BeforeEach
    void setUp() {
        incidents = new IncidentService(new InMemoryIncidentRepository(), id -> false, i -> { }, clock,
                Duration.ofMinutes(5));
        EscalationPolicy policy = new EscalationPolicy("esc_pay", "Payments", List.of(
                new EscalationPolicy.Step(Duration.ZERO, List.of("chn_team")),
                new EscalationPolicy.Step(Duration.ofMinutes(15), List.of("chn_manager"))), List.of("grp_pay"));
        runner = new EscalationRunner(() -> List.of(policy), incidents,
                monitorId -> monitorId.startsWith("pay") ? Optional.of("grp_pay") : Optional.empty(),
                (incident, channels) -> channels.forEach(c -> sent.add(incident.monitorId() + "->" + c)), clock);
        incidents.onStateChanged(new MonitorStateChanged("pay_api", MonitorState.OK, MonitorState.DOWN, T0, T0));
    }

    @Test
    @DisplayName("each step is sent once when its time comes")
    void stepsOnce() {
        runner.tick();
        runner.tick();
        assertThat(sent).containsExactly("pay_api->chn_team");

        now = T0.plus(Duration.ofMinutes(16));
        runner.tick();
        assertThat(sent).containsExactly("pay_api->chn_team", "pay_api->chn_manager");
    }

    @Test
    @DisplayName("acknowledging stops further steps and clears the countdown")
    void stopsOnAck() {
        runner.tick();
        Incident incident = incidents.openIncident("pay_api").orElseThrow();
        assertThat(runner.escalatesAt(incident)).contains(T0.plus(Duration.ofMinutes(15)));

        Incident acked = incidents.acknowledge(incident.id(), "Ana");
        now = T0.plus(Duration.ofMinutes(30));
        runner.tick();

        assertThat(sent).containsExactly("pay_api->chn_team");
        assertThat(runner.escalatesAt(acked)).isEmpty();
    }

    @Test
    @DisplayName("monitors outside the policy groups do not escalate")
    void otherGroups() {
        incidents.onStateChanged(new MonitorStateChanged("other", MonitorState.OK, MonitorState.DOWN, T0, T0));
        runner.tick();
        assertThat(sent).noneMatch(s -> s.startsWith("other"));
    }
}
