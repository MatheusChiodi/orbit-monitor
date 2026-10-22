package io.orbit.api.wall;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;
import io.orbit.alerting.IncidentEventType;
import io.orbit.api.runtime.Notice;
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
    private final WallTitles titles;
    private final Map<String, CheckResult> lastResults = new ConcurrentHashMap<>();

    public WallPublisher(WallSocketHandler socket, WallViewFactory views, WallTimeline timeline,
                         MonitorDefinitions definitions) {
        this(socket, views, timeline, definitions, WallTitles.english());
    }

    public WallPublisher(WallSocketHandler socket, WallViewFactory views, WallTimeline timeline,
                         MonitorDefinitions definitions, WallTitles titles) {
        this.titles = titles;
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
            case DOWN -> titles.text("wall.timeline.down", "{0} is down", name);
            case WARN -> titles.text("wall.timeline.warn", "{0} needs attention", name);
            default -> titles.text("wall.timeline.ok", "{0} recovered", name);
        };
        socket.broadcast("event", timeline.add(event.current().name(), title, detail(event.monitorId()), event.at()));
    }

    public void onIncident(Incident incident) {
        socket.broadcast("incident", views.incidentView(incident));
        IncidentEvent last = incident.events().getLast();
        if (last.type() == IncidentEventType.ACKNOWLEDGED) {
            String name = definitions.monitor(incident.monitorId()).map(MonitorDef::name).orElse(incident.monitorId());
            socket.broadcast("event", timeline.add("ACK",
                    titles.text("wall.timeline.ack", "{0} acknowledged by {1}", name, last.actor()), "", last.at()));
        }
    }

    /** Informational events such as a certificate crossing a warning step (BE-05). */
    public void onNotice(Notice notice) {
        String title = titles.text(notice.key(), notice.type() + " {0}", notice.args().toArray());
        socket.broadcast("event", timeline.add("INFO", title, "", notice.at()));
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
