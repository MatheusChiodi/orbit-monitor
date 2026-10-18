package io.orbit.alerting;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IncidentServiceTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final MutableClock clock = new MutableClock(T0);
    private final List<Incident> published = new ArrayList<>();
    private final IncidentService service = new IncidentService(new InMemoryIncidentRepository(),
            monitorId -> Set.of("warn-sensitive").contains(monitorId), published::add, clock, Duration.ofMinutes(5));

    private void change(String monitor, MonitorState from, MonitorState to, int second) {
        Instant at = T0.plusSeconds(second);
        clock.set(at);
        service.onStateChanged(new MonitorStateChanged(monitor, from, to, at, at));
    }

    @Test
    void downOpensAnIncident() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);

        Incident incident = service.openIncident("m").orElseThrow();
        assertThat(incident.status()).isEqualTo(IncidentStatus.OPEN);
        assertThat(incident.severity()).isEqualTo(MonitorState.DOWN);
        assertThat(incident.openedAt()).isEqualTo(T0);
        assertThat(incident.events()).extracting(IncidentEvent::type).containsExactly(IncidentEventType.OPENED);
        assertThat(published).hasSize(1);
    }

    @Test
    void warnOpensOnlyWhenConfigured() {
        change("m", MonitorState.OK, MonitorState.WARN, 0);
        change("warn-sensitive", MonitorState.OK, MonitorState.WARN, 0);

        assertThat(service.openIncident("m")).isEmpty();
        assertThat(service.openIncident("warn-sensitive")).map(Incident::severity).contains(MonitorState.WARN);
    }

    @Test
    void recoveryResolvesWithDuration() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        change("m", MonitorState.DOWN, MonitorState.OK, 600);

        assertThat(service.openIncident("m")).isEmpty();
        Incident resolved = service.recent().getFirst();
        assertThat(resolved.status()).isEqualTo(IncidentStatus.RESOLVED);
        assertThat(resolved.resolvedAt()).isEqualTo(T0.plusSeconds(600));
        assertThat(resolved.duration()).isEqualTo(Duration.ofMinutes(10));
    }

    @Test
    void escalationFromWarnToDownChangesSeverity() {
        change("warn-sensitive", MonitorState.OK, MonitorState.WARN, 0);
        change("warn-sensitive", MonitorState.WARN, MonitorState.DOWN, 60);

        Incident incident = service.openIncident("warn-sensitive").orElseThrow();
        assertThat(incident.severity()).isEqualTo(MonitorState.DOWN);
        assertThat(incident.events()).extracting(IncidentEvent::type)
                .containsExactly(IncidentEventType.OPENED, IncidentEventType.SEVERITY_CHANGED);
        assertThat(service.recent()).hasSize(1);
    }

    @Test
    void downToWarnKeepsTheIncidentOpen() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        change("m", MonitorState.DOWN, MonitorState.WARN, 60);
        assertThat(service.openIncident("m")).map(Incident::severity).contains(MonitorState.WARN);
    }

    @Test
    void relapseWithinTheWindowReopens() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        change("m", MonitorState.DOWN, MonitorState.OK, 60);
        change("m", MonitorState.OK, MonitorState.DOWN, 120);

        assertThat(service.recent()).hasSize(1);
        Incident incident = service.openIncident("m").orElseThrow();
        assertThat(incident.events()).extracting(IncidentEvent::type).containsExactly(
                IncidentEventType.OPENED, IncidentEventType.RESOLVED, IncidentEventType.REOPENED);
        assertThat(incident.resolvedAt()).isNull();
    }

    @Test
    void relapseAfterTheWindowOpensANewIncident() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        change("m", MonitorState.DOWN, MonitorState.OK, 60);
        change("m", MonitorState.OK, MonitorState.DOWN, 60 + 301);
        assertThat(service.recent()).hasSize(2);
    }

    @Test
    void acknowledgeRecordsOperatorAndTime() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        String id = service.openIncident("m").orElseThrow().id();
        clock.set(T0.plusSeconds(90));

        Incident acked = service.acknowledge(id, "  M. Chiodi ");

        assertThat(acked.acknowledgedBy()).isEqualTo("M. Chiodi");
        assertThat(acked.acknowledgedAt()).isEqualTo(T0.plusSeconds(90));
        assertThat(acked.timeToAcknowledge()).isEqualTo(Duration.ofSeconds(90));
        assertThat(acked.events().getLast().actor()).isEqualTo("M. Chiodi");
    }

    @Test
    void acknowledgeTwiceKeepsTheFirstAcknowledgement() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        String id = service.openIncident("m").orElseThrow().id();
        service.acknowledge(id, "Ana");
        Incident again = service.acknowledge(id, "Bruno");
        assertThat(again.acknowledgedBy()).isEqualTo("Ana");
    }

    @Test
    void resolvedIncidentCannotBeAcknowledged() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        String id = service.openIncident("m").orElseThrow().id();
        change("m", MonitorState.DOWN, MonitorState.OK, 30);
        assertThatThrownBy(() -> service.acknowledge(id, "Ana")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void operatorNameIsRequiredAndBounded() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        String id = service.openIncident("m").orElseThrow().id();
        assertThatThrownBy(() -> service.acknowledge(id, " ")).isInstanceOf(IllegalArgumentException.class);
        assertThat(service.acknowledge(id, "x".repeat(200)).acknowledgedBy()).hasSize(60);
    }

    @Test
    void commentsAndTicketsGoToTheEventLog() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        String id = service.openIncident("m").orElseThrow().id();

        service.comment(id, "Ana", "Restarting the pool");
        Incident incident = service.linkTicket(id, "Ana", "INC-4821");

        assertThat(incident.ticket()).isEqualTo("INC-4821");
        assertThat(incident.events()).extracting(IncidentEvent::type).containsExactly(
                IncidentEventType.OPENED, IncidentEventType.COMMENTED, IncidentEventType.TICKET_LINKED);
        assertThat(incident.events().get(1).detail()).isEqualTo("Restarting the pool");
    }

    @Test
    void unknownIncidentIsReported() {
        assertThatThrownBy(() -> service.acknowledge("inc_nope", "Ana")).isInstanceOf(IncidentNotFoundException.class);
    }

    @Test
    void unknownStateIsIgnored() {
        change("m", MonitorState.OK, MonitorState.UNKNOWN, 0);
        assertThat(service.recent()).isEmpty();
    }

    /** Clock whose instant the test controls. */
    static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void set(Instant instant) {
            now = instant;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
