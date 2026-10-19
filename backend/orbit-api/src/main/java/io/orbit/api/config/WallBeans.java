package io.orbit.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.alerting.IncidentService;
import io.orbit.alerting.escalation.EscalationRunner;
import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.api.wall.WallPublisher;
import io.orbit.api.wall.WallSocketHandler;
import io.orbit.api.wall.WallTimeline;
import io.orbit.api.wall.WallViewFactory;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.telemetry.TelemetryService;
import io.orbit.workspace.GroupService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/** Wall views, timeline, WebSocket handler and the publisher subscribed to domain events. */
@Configuration
public class WallBeans {

    private final OrbitProperties properties;
    private final ObjectMapper json;

    public WallBeans(OrbitProperties properties, ObjectMapper json) {
        this.properties = properties;
        this.json = json;
    }

    @Bean
    WallTimeline wallTimeline() {
        return new WallTimeline(500, properties.history());
    }

    @Bean
    WallViewFactory wallViewFactory(MonitorDefinitions definitions, TelemetryService telemetry,
                                    MonitorRuntime runtime, GroupService groups, IncidentService incidents,
                                    WallTimeline timeline, Clock clock, EscalationRunner escalation) {
        WallViewFactory factory = new WallViewFactory(definitions, telemetry, runtime, groups, incidents, timeline,
                clock, properties.environment());
        factory.setEscalatesAt(escalation::escalatesAt);
        return factory;
    }

    @Bean
    WallSocketHandler wallSocketHandler(WallViewFactory views) {
        return new WallSocketHandler(json, views::snapshot);
    }

    @Bean
    WallPublisher wallPublisher(WallSocketHandler socket, WallViewFactory views, WallTimeline timeline,
                                MonitorDefinitions definitions, EventBus bus) {
        WallPublisher publisher = new WallPublisher(socket, views, timeline, definitions);
        bus.onCheck(publisher::onCheck);
        bus.onStateChange(publisher::onStateChanged);
        bus.onIncident(publisher::onIncident);
        return publisher;
    }
}
