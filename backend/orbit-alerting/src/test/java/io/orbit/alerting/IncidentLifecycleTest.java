package io.orbit.alerting;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-26 manual resolve/reopen, BE-25 flapping and BE-30 cascade in the incident lifecycle")
class IncidentLifecycleTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final IncidentServiceTest.MutableClock clock = new IncidentServiceTest.MutableClock(T0);
    private final List<Incident> published = new ArrayList<>();
    private final IncidentService service = new IncidentService(new InMemoryIncidentRepository(), id -> false,
            published::add, clock, Duration.ofMinutes(5));
    private final Set<String> flapping = new HashSet<>();
    private final Map<String, MonitorState> states = new HashMap<>();

    private void change(String monitor, MonitorState from, MonitorState to, int second) {
        Instant at = T0.plusSeconds(second);
        clock.set(at);
        states.put(monitor, to);
        service.onStateChanged(new MonitorStateChanged(monitor, from, to, at, at));
    }

    private void flapDetection() {
        service.setFlapping(new IncidentService.Flapping() {
            @Override
            public boolean observe(MonitorStateChanged change) {
                return flapping.contains(change.monitorId());
            }

            @Override
            public boolean isFlapping(String monitorId, Instant now) {
                return flapping.contains(monitorId);
            }
        });
    }

    @Test
    @DisplayName("an operator resolves an open incident and reopens it with their name on the timeline")
    void manualResolveAndReopen() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        String id = service.openIncident("m").orElseThrow().id();
        service.acknowledge(id, "Ana");
        clock.set(T0.plusSeconds(120));

        Incident resolved = service.resolve(id, "Bia");
        assertThat(resolved.status()).isEqualTo(IncidentStatus.RESOLVED);
        assertThat(resolved.resolvedAt()).isEqualTo(T0.plusSeconds(120));
        assertThat(resolved.events().getLast()).extracting(IncidentEvent::type, IncidentEvent::actor)
                .containsExactly(IncidentEventType.RESOLVED, "Bia");
        assertThatThrownBy(() -> service.resolve(id, "Bia")).isInstanceOf(IllegalStateException.class);

        clock.set(T0.plusSeconds(180));
        Incident reopened = service.reopen(id, "Caio");
        assertThat(reopened.isOpen()).isTrue();
        assertThat(reopened.resolvedAt()).isNull();
        assertThat(reopened.acknowledgedBy()).isNull();
        assertThat(reopened.events().getLast()).extracting(IncidentEvent::type, IncidentEvent::actor, IncidentEvent::at)
                .containsExactly(IncidentEventType.REOPENED, "Caio", T0.plusSeconds(180));
        assertThatThrownBy(() -> service.reopen(id, "Caio")).isInstanceOf(IllegalStateException.class);
        assertThat(published.getLast()).isEqualTo(reopened);
    }

    @Test
    @DisplayName("a reopen is refused while the monitor already has another open incident")
    void reopenRefusedWithAnotherOpenIncident() {
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        String first = service.openIncident("m").orElseThrow().id();
        change("m", MonitorState.DOWN, MonitorState.OK, 60);
        change("m", MonitorState.OK, MonitorState.DOWN, 60 + 400);
        assertThatThrownBy(() -> service.reopen(first, "Ana")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("while flapping one incident stays open, flagged, without a resolve per change")
    void flappingKeepsOneIncident() {
        flapDetection();
        change("m", MonitorState.OK, MonitorState.DOWN, 0);
        change("m", MonitorState.DOWN, MonitorState.OK, 30);
        change("m", MonitorState.OK, MonitorState.DOWN, 60);
        flapping.add("m");
        change("m", MonitorState.DOWN, MonitorState.OK, 90);
        change("m", MonitorState.OK, MonitorState.DOWN, 120);
        change("m", MonitorState.DOWN, MonitorState.OK, 150);

        assertThat(service.recent()).hasSize(1);
        Incident incident = service.openIncident("m").orElseThrow();
        assertThat(incident.flapping()).isTrue();
        assertThat(incident.events()).extracting(IncidentEvent::type).containsExactly(IncidentEventType.OPENED,
                IncidentEventType.RESOLVED, IncidentEventType.REOPENED, IncidentEventType.FLAPPING_STARTED);
    }

    @Test
    @DisplayName("once it settles the flapping incident resolves when the monitor is OK, or just stops flapping")
    void flappingSettles() {
        flapDetection();
        flapping.add("up");
        flapping.add("down");
        change("up", MonitorState.OK, MonitorState.DOWN, 0);
        change("up", MonitorState.DOWN, MonitorState.OK, 30);
        change("down", MonitorState.OK, MonitorState.DOWN, 0);
        change("down", MonitorState.DOWN, MonitorState.OK, 30);
        change("down", MonitorState.OK, MonitorState.DOWN, 60);

        clock.set(T0.plusSeconds(600));
        service.settle(states::get);
        assertThat(service.openIncident("up")).isPresent();

        flapping.clear();
        service.settle(states::get);

        Incident up = service.recent().stream().filter(i -> i.monitorId().equals("up")).findFirst().orElseThrow();
        assertThat(up.status()).isEqualTo(IncidentStatus.RESOLVED);
        assertThat(up.events()).extracting(IncidentEvent::type).endsWith(IncidentEventType.FLAPPING_STOPPED,
                IncidentEventType.RESOLVED);
        Incident down = service.openIncident("down").orElseThrow();
        assertThat(down.flapping()).isFalse();
        assertThat(down.events().getLast().type()).isEqualTo(IncidentEventType.FLAPPING_STOPPED);
    }

    @Test
    @DisplayName("a downstream incident collapses into the open upstream incident")
    void cascade() {
        change("bus", MonitorState.OK, MonitorState.DOWN, 0);
        String upstream = service.openIncident("bus").orElseThrow().id();
        service.setUpstream(monitorId -> monitorId.equals("portal") ? Optional.of(upstream) : Optional.empty());

        change("portal", MonitorState.OK, MonitorState.DOWN, 30);

        Incident child = service.openIncident("portal").orElseThrow();
        assertThat(child.parentId()).isEqualTo(upstream);
        Incident parent = service.find(upstream).orElseThrow();
        assertThat(parent.events().getLast()).extracting(IncidentEvent::type, IncidentEvent::detail)
                .containsExactly(IncidentEventType.CORRELATED, "portal");
        assertThat(service.openIncident("bus").orElseThrow().parentId()).isNull();
    }
}
