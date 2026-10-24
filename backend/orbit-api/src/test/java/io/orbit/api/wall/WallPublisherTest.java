package io.orbit.api.wall;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckResult;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WallPublisherTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:00Z");
    private final WallSocketHandler socket = mock(WallSocketHandler.class);
    private final WallViewFactory views = mock(WallViewFactory.class);
    private final MonitorDefinitions definitions = mock(MonitorDefinitions.class);
    private final WallTimeline timeline = new WallTimeline(50, Duration.ofHours(24));
    private final WallPublisher publisher = new WallPublisher(socket, views, timeline, definitions);

    @Test
    void finishedCheckPushesTheMonitorView() {
        var view = new WallViews.MonitorView("m", "Queue", null, "SQL", "OK", 1.0, null, null, NOW, List.of(), NOW, null, false);
        when(views.monitorView("m")).thenReturn(Optional.of(view));

        publisher.onCheck(new CheckResult("m", MonitorState.OK, 3, null, List.of(), null, NOW));

        verify(socket).broadcast("monitor", view);
    }

    @Test
    void stateChangeAddsATimelineEntryWithTheFailureDetail() {
        publisher.onCheck(new CheckResult("m", MonitorState.DOWN, 0, null, List.of(), "Timed out after 5000 ms", NOW));
        publisher.onStateChanged(new MonitorStateChanged("m", MonitorState.OK, MonitorState.DOWN, NOW, NOW));

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(socket).broadcast(eq("event"), payload.capture());
        var event = (WallViews.TimelineEventView) payload.getValue();
        assertThat(event.kind()).isEqualTo("DOWN");
        assertThat(event.title()).isEqualTo("m is down");
        assertThat(event.detail()).contains("Timed out");
        assertThat(timeline.recent()).hasSize(1);
    }

    @Test
    void firstOkAfterStartupIsNotNews() {
        publisher.onStateChanged(new MonitorStateChanged("m", MonitorState.UNKNOWN, MonitorState.OK, NOW, NOW));
        verify(socket, never()).broadcast(eq("event"), any());
    }

    @Test
    void acknowledgementPushesIncidentAndTimelineEntry() {
        List<Incident> changes = new ArrayList<>();
        var incidents = new IncidentService(new InMemoryIncidentRepository(), id -> false, changes::add,
                Clock.fixed(NOW, ZoneOffset.UTC), Duration.ofMinutes(5));
        incidents.onStateChanged(new MonitorStateChanged("m", MonitorState.OK, MonitorState.DOWN, NOW, NOW));
        Incident acked = incidents.acknowledge(changes.getFirst().id(), "Ana");
        when(views.incidentView(any())).thenReturn(new WallViews.IncidentView(acked.id(), "m", "DOWN", NOW, "Ana", NOW,
                List.of(), null));

        publisher.onIncident(acked);

        verify(socket).broadcast(eq("incident"), any());
        verify(socket, times(1)).broadcast(eq("event"), any());
        assertThat(timeline.recent().getFirst().title()).isEqualTo("m acknowledged by Ana");
    }
}
