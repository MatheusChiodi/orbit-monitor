package io.orbit.api.runtime;

import io.orbit.api.config.OrbitProperties;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.schedule.ProbeScheduler;
import io.orbit.probe.schedule.ProbeWorkers;
import io.orbit.security.settings.SettingsService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Starts the workers when the app is ready, ticks the scheduler every second and picks up file edits. */
@Component
public class RuntimeLifecycle {

    private final MonitorRuntime runtime;
    private final MonitorDefinitions definitions;
    private final ProbeScheduler scheduler;
    private final ProbeWorkers workers;
    private final OrbitProperties properties;
    private final SettingsService settings;
    private volatile boolean started;

    public RuntimeLifecycle(MonitorRuntime runtime, MonitorDefinitions definitions, ProbeScheduler scheduler,
                            ProbeWorkers workers, OrbitProperties properties, SettingsService settings) {
        this.settings = settings;
        this.runtime = runtime;
        this.definitions = definitions;
        this.scheduler = scheduler;
        this.workers = workers;
        this.properties = properties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        runtime.syncSchedule();
        workers.start(properties.workers());
        started = true;
    }

    @Scheduled(fixedDelay = 1_000)
    public void tick() {
        if (started) {
            scheduler.tick();
        }
    }

    @Scheduled(fixedDelay = 5_000)
    public void reloadEditedFiles() {
        if (!started) {
            return;
        }
        settings.reloadIfChanged();
        if (definitions.reloadIfChanged()) {
            runtime.syncSchedule();
        }
    }
}
