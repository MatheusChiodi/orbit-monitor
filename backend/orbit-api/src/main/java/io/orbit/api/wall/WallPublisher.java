package io.orbit.api.wall;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;
import io.orbit.alerting.IncidentEventType;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckResult;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Turns domain events into wall messages: every finished check pushes the monitor view, every
 * confirmed state change adds a timeline entry, every incident change pushes the incident.
 */
public class WallPublisher {

    private final WallSocketHandler socket;
    private final WallViewFactory views;
    private final WallTimeline timeline;
    private final MonitorDefinitions definitions;
    private final Map<String, CheckResult> lastResults = new ConcurrentHashMap<>();

    public WallPublisher(WallSocketHandler socket, WallViewFactory views, WallTimeline timeline,
                         MonitorDefinitions definitions) {
        this.socket = socket;
        this.views = views;
        this.timeline = timeline;
        this.definitions = definitions;
    }

    public void onCheck(CheckResult result) {
        lastResults.put(result.monitorId(), result);
        views.monitorView(result.monitorId()).ifPresent(view -> socket.broadcast("monitor", view));
    }

    public void onStateChanged(MonitorStateChanged event) {
        if (event.current() == MonitorState.UNKNOWN || event.previous() == MonitorState.UNKNOWN
                && event.current() == MonitorState.OK) {
            return;
        }
        String name = definitions.monitor(event.monitorId()).map(MonitorDef::name).orElse(event.monitorId());
        String title = switch (event.current()) {
            case DOWN -> name + " is down";
            case WARN -> name + " needs attention";
            default -> name + " recovered";
        };
        socket.broadcast("event", timeline.add(event.current().name(), title, detail(event.monitorId()), event.at()));
    }

    public void onIncident(Incident incident) {
        socket.broadcast("incident", views.incidentView(incident));
        IncidentEvent last = incident.events().getLast();
        if (last.type() == IncidentEventType.ACKNOWLEDGED) {
            String name = definitions.monitor(incident.monitorId()).map(MonitorDef::name).orElse(incident.monitorId());
            socket.broadcast("event", timeline.add("ACK", name + " acknowledged by " + last.actor(), "", last.at()));
        }
    }

    /** First failing condition or the check error, both already masked. */
    private String detail(String monitorId) {
        CheckResult result = lastResults.get(monitorId);
        if (result == null) {
            return "";
        }
        if (result.error() != null) {
            return result.error();
        }
        Optional<ConditionResult> failure = result.conditions().stream().filter(c -> !c.passed()).findFirst();
        return failure.map(ConditionResult::message).orElse("");
    }
}
