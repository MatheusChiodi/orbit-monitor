package io.orbit.api.wall;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.api.runtime.PrimaryValue;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckResult;
import io.orbit.telemetry.MonitorStatus;
import io.orbit.telemetry.Statistics;
import io.orbit.telemetry.TelemetryService;
import io.orbit.workspace.Group;
import io.orbit.workspace.GroupService;
import io.orbit.workspace.WorkspaceService;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/** Builds the wall views from configuration, telemetry, latest results and incidents. */
public class WallViewFactory {

    private static final int SERIES_MINUTES = 60;

    private final MonitorDefinitions definitions;
    private final TelemetryService telemetry;
    private final MonitorRuntime runtime;
    private final GroupService groups;
    private final IncidentService incidents;
    private final WallTimeline timeline;
    private final Clock clock;
    private final String environment;
    private Function<Incident, Optional<Instant>> escalatesAt = incident -> Optional.empty();
    private Supplier<Optional<WallViews.BrandingView>> branding = Optional::empty;
    private Predicate<String> inMaintenance = monitorId -> false;

    public WallViewFactory(MonitorDefinitions definitions, TelemetryService telemetry, MonitorRuntime runtime,
                           GroupService groups, IncidentService incidents, WallTimeline timeline, Clock clock,
                           String environment) {
        this.definitions = definitions;
        this.telemetry = telemetry;
        this.runtime = runtime;
        this.groups = groups;
        this.incidents = incidents;
        this.timeline = timeline;
        this.clock = clock;
        this.environment = environment;
    }

    /** BE-27: source of the escalation countdown shown on the wall. */
    public void setEscalatesAt(Function<Incident, Optional<Instant>> escalatesAt) {
        this.escalatesAt = escalatesAt;
    }

    /** FE-10: source of the workspace name and logo shown on the wall. */
    public void setBranding(Supplier<Optional<WallViews.BrandingView>> branding) {
        this.branding = branding;
    }

    /** CORE-07: monitors in an active maintenance window (directly or through their group). */
    public void setInMaintenance(Predicate<String> inMaintenance) {
        this.inMaintenance = inMaintenance;
    }

    public WallViews.MonitorView monitorView(MonitorDef def) {
        MonitorStatus status = telemetry.status(def.id());
        Optional<CheckResult> latest = runtime.latest(def.id());
        PrimaryValue primary = latest.map(r -> PrimaryValue.of(def, r)).orElse(null);
        WallViews.RuleView rule = primary == null || primary.rule() == null ? null
                : new WallViews.RuleView(primary.rule().field(), primary.rule().operator(), primary.rule().limit());
        return new WallViews.MonitorView(def.id(), def.name(), def.groupId(), def.kind().name(), status.state().name(),
                primary == null ? null : primary.value(), primary == null ? null : primary.unit(), rule, status.since(),
                Statistics.minuteSeries(status.history(), clock.instant(), SERIES_MINUTES), status.lastCheckAt(),
                latest.map(CheckResult::error).orElse(null));
    }

    public Optional<WallViews.MonitorView> monitorView(String monitorId) {
        return definitions.monitor(monitorId).map(this::monitorView);
    }

    public List<WallViews.GroupView> groupViews() {
        Map<String, List<MonitorDef>> byGroup = definitions.monitors().stream()
                .filter(m -> m.groupId() != null)
                .collect(Collectors.groupingBy(MonitorDef::groupId));
        return groups.list().stream().map(g -> {
            List<String> members = byGroup.getOrDefault(g.id(), List.of()).stream().map(MonitorDef::id).toList();
            Set<String> paused = members.stream().filter(inMaintenance).collect(Collectors.toSet());
            return new WallViews.GroupView(g.id(), g.name(), g.color(),
                    WorkspaceService.groupState(members, telemetry::currentState, paused).name());
        }).toList();
    }

    public WallViews.IncidentView incidentView(Incident incident) {
        Map<String, String> groupNames = groups.list().stream().collect(Collectors.toMap(Group::id, Group::name));
        List<String> impact = definitions.monitor(incident.monitorId()).map(MonitorDef::groupId)
                .map(groupNames::get).filter(Objects::nonNull).map(List::of).orElse(List.of());
        return new WallViews.IncidentView(incident.id(), incident.monitorId(), incident.severity().name(),
                incident.openedAt(), incident.acknowledgedBy(), incident.acknowledgedAt(), impact,
                escalatesAt.apply(incident).orElse(null));
    }

    public WallViews.WallSnapshot snapshot() {
        List<WallViews.MonitorView> monitors = definitions.monitors().stream().map(this::monitorView).toList();
        List<WallViews.IncidentView> open = incidents.recent().stream().filter(Incident::isOpen)
                .map(this::incidentView).toList();
        return new WallViews.WallSnapshot(clock.instant(), environment, groupViews(), monitors, open,
                timeline.recent(), uptime(), timeline.lastRecoveryAt().orElse(null), branding.get().orElse(null));
    }

    /** Mean availability of the monitors that have data, in percentage points. */
    private double uptime() {
        List<Double> ratios = definitions.monitors().stream()
                .map(MonitorDef::id)
                .map(telemetry::status)
                .map(MonitorStatus::uptime)
                .filter(u -> u.samples() > 0)
                .map(io.orbit.telemetry.UptimeReport::ratio)
                .toList();
        return ratios.isEmpty() ? 100.0 : ratios.stream().mapToDouble(Double::doubleValue).average().orElse(1) * 100.0;
    }
}
