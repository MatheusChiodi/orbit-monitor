package io.orbit.api.wall;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.telemetry.HeartbeatStore;
import io.orbit.telemetry.StateTracker;
import io.orbit.telemetry.TelemetryService;
import io.orbit.workspace.GroupService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Wall snapshot: next escalation step of each incident (BE-27) and who is on call (BE-33)")
class WallEscalationViewTest {

    private static final Instant NOW = Instant.parse("2026-10-22T12:00:00Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final MonitorDefinitions definitions = mock(MonitorDefinitions.class);
    private final GroupService groups = mock(GroupService.class);
    private final List<Incident> changes = new ArrayList<>();
    private final IncidentService incidents = new IncidentService(new InMemoryIncidentRepository(), id -> false,
            changes::add, clock, Duration.ofMinutes(5));
    private final WallViewFactory factory = new WallViewFactory(definitions, new TelemetryService(
            new HeartbeatStore(Duration.ofHours(24), 100), new StateTracker(), e -> { }), mock(MonitorRuntime.class),
            groups, incidents, new WallTimeline(50, Duration.ofHours(24)), clock, "NOC");

    @Test
    @DisplayName("an open incident shows its next step (name, due time, on call); the snapshot lists on-call people")
    void nextStepAndOnCall() {
        when(definitions.monitors()).thenReturn(List.<MonitorDef>of());
        when(definitions.monitor("m")).thenReturn(Optional.empty());
        when(groups.list()).thenReturn(List.of());
        incidents.onStateChanged(new MonitorStateChanged("m", MonitorState.OK, MonitorState.DOWN, NOW, NOW));
        Instant due = NOW.plus(Duration.ofMinutes(10));
        factory.setNextEscalation(incident -> Optional.of(new WallViews.NextStepView("Call DBA", due, "Bruno")));
        factory.setOnCall(() -> List.of(new WallViews.OnCallView("Database", "Bruno", NOW.plus(Duration.ofHours(8)))));

        WallViews.WallSnapshot snapshot = factory.snapshot();

        WallViews.IncidentView incident = snapshot.incidents().getFirst();
        assertThat(incident.nextStep()).isEqualTo(new WallViews.NextStepView("Call DBA", due, "Bruno"));
        assertThat(snapshot.onCall()).extracting(WallViews.OnCallView::person).containsExactly("Bruno");
    }
}
