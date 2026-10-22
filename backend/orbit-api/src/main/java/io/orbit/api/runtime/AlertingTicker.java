package io.orbit.api.runtime;

import io.orbit.alerting.IncidentService;
import io.orbit.telemetry.TelemetryService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** BE-25: settles flapping incidents (stop flapping, resolve when the monitor is OK again). */
@Component
public class AlertingTicker {

    private final IncidentService incidents;
    private final TelemetryService telemetry;

    public AlertingTicker(IncidentService incidents, TelemetryService telemetry) {
        this.incidents = incidents;
        this.telemetry = telemetry;
    }

    @Scheduled(fixedDelay = 15_000, initialDelay = 15_000)
    public void settleFlapping() {
        incidents.settle(telemetry::currentState);
    }
}
