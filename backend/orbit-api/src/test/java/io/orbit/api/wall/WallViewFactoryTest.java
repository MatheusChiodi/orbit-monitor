package io.orbit.api.wall;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.IncidentService;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.definition.ConditionDef;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.probe.CheckResult;
import io.orbit.telemetry.Heartbeat;
import io.orbit.telemetry.HeartbeatStore;
import io.orbit.telemetry.StateTracker;
import io.orbit.telemetry.TelemetryService;
import io.orbit.workspace.Group;
import io.orbit.workspace.GroupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WallViewFactoryTest {

    private static final Instant NOW = Instant.parse("2026-10-18T12:00:30Z");
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final MonitorDefinitions definitions = mock(MonitorDefinitions.class);
    private final MonitorRuntime runtime = mock(MonitorRuntime.class);
    private final GroupService groups = mock(GroupService.class);
    private final TelemetryService telemetry = new TelemetryService(new HeartbeatStore(Duration.ofHours(24), 100),
            new StateTracker(), e -> { });
    private final IncidentService incidents = new IncidentService(new InMemoryIncidentRepository(), id -> false,
            i -> { }, clock, Duration.ofMinutes(5));
    private final WallTimeline timeline = new WallTimeline(50, Duration.ofHours(24));
    private WallViewFactory factory;

    private final SqlMonitorDef queue = new SqlMonitorDef("sel_queue", "Reconciliation queue", "grp_payments", "con",
            "SELECT 1", 60, 30_000, 500, 1, 0.1, false,
            List.of(new ConditionDef("[COL].PENDING_QTY < 200", Severity.DOWN)), List.of(), false, null, null);

    @BeforeEach
    void setUp() {
        factory = new WallViewFactory(definitions, telemetry, runtime, groups, incidents, timeline, clock, "NOC");
        when(definitions.monitors()).thenReturn(List.<MonitorDef>of(queue));
        when(definitions.monitor("sel_queue")).thenReturn(Optional.of(queue));
        when(groups.list()).thenReturn(List.of(new Group("grp_payments", "Payments", "#3b9eff", null, null, null,
                List.of(), 0, null, null)));
    }

    private void checked(MonitorState state, double value, Instant at) {
        var condition = new ConditionParser().parse("[COL].PENDING_QTY < 200", Severity.DOWN);
        var result = new CheckResult("sel_queue", state, 40, null,
                List.of(new ConditionResult(condition, state == MonitorState.OK, new BigDecimal(value), "x")), null, at);
        when(runtime.latest("sel_queue")).thenReturn(Optional.of(result));
        telemetry.record(new Heartbeat("sel_queue", state, 40, value, at), 1);
    }

    @Test
    void monitorViewCarriesStateRuleValueAndSeries() {
        checked(MonitorState.DOWN, 347, NOW.minusSeconds(20));

        WallViews.MonitorView view = factory.monitorView(queue);

        assertThat(view.status()).isEqualTo("DOWN");
        assertThat(view.type()).isEqualTo("SQL");
        assertThat(view.value()).isEqualTo(347.0);
        assertThat(view.rule()).isEqualTo(new WallViews.RuleView("PENDING_QTY", "<", 200.0));
        assertThat(view.since()).isEqualTo(NOW.minusSeconds(20));
        assertThat(view.series()).hasSize(60).last().isEqualTo(347.0);
    }

    @Test
    void monitorWithoutChecksIsUnknown() {
        when(runtime.latest("sel_queue")).thenReturn(Optional.empty());
        WallViews.MonitorView view = factory.monitorView(queue);
        assertThat(view.status()).isEqualTo("UNKNOWN");
        assertThat(view.value()).isNull();
    }

    @Test
    void snapshotHasGroupsWithWorstStateOpenIncidentsAndUptime() {
        checked(MonitorState.OK, 120, NOW.minusSeconds(120));
        checked(MonitorState.DOWN, 347, NOW.minusSeconds(20));
        incidents.onStateChanged(new MonitorStateChanged("sel_queue", MonitorState.OK, MonitorState.DOWN,
                NOW.minusSeconds(20), NOW.minusSeconds(20)));

        WallViews.WallSnapshot snapshot = factory.snapshot();

        assertThat(snapshot.environment()).isEqualTo("NOC");
        assertThat(snapshot.generatedAt()).isEqualTo(NOW);
        assertThat(snapshot.groups()).containsExactly(new WallViews.GroupView("grp_payments", "Payments", "#3b9eff", "DOWN"));
        assertThat(snapshot.monitors()).hasSize(1);
        assertThat(snapshot.incidents()).singleElement().satisfies(i -> {
            assertThat(i.severity()).isEqualTo("DOWN");
            assertThat(i.monitorId()).isEqualTo("sel_queue");
            assertThat(i.impact()).containsExactly("Payments");
        });
        assertThat(snapshot.uptime24h()).isEqualTo(50.0);
    }

    @Test
    void incidentCarriesTheEscalationCountdown() {
        checked(MonitorState.DOWN, 347, NOW.minusSeconds(20));
        incidents.onStateChanged(new MonitorStateChanged("sel_queue", MonitorState.OK, MonitorState.DOWN,
                NOW.minusSeconds(20), NOW.minusSeconds(20)));
        factory.setEscalatesAt(incident -> Optional.of(NOW.plusSeconds(840)));

        assertThat(factory.snapshot().incidents().getFirst().escalatesAt()).isEqualTo(NOW.plusSeconds(840));
    }

    @Test
    void uptimeIsFullWithoutData() {
        when(runtime.latest("sel_queue")).thenReturn(Optional.empty());
        assertThat(factory.snapshot().uptime24h()).isEqualTo(100.0);
    }
}
