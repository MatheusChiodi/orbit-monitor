package io.orbit.api.config;

import io.orbit.api.runtime.ConnectionPools;
import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.resilience.CircuitBreaker;
import io.orbit.probe.resilience.TargetLimiter;
import io.orbit.probe.schedule.ProbeScheduler;
import io.orbit.probe.schedule.ProbeWorkers;
import io.orbit.security.vault.SecretResolver;
import io.orbit.telemetry.TelemetryService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/** Local execution pieces: in-memory queue, scheduler, workers and per-target connection pools. */
@Configuration
public class RuntimeBeans {

    @Bean
    BlockingQueue<String> probeQueue() {
        return new LinkedBlockingQueue<>(10_000);
    }

    @Bean
    ProbeScheduler probeScheduler(Clock clock, BlockingQueue<String> probeQueue) {
        return new ProbeScheduler(clock, probeQueue);
    }

    @Bean(destroyMethod = "close")
    ConnectionPools connectionPools(SecretResolver secrets) {
        return new ConnectionPools(secrets);
    }

    @Bean
    MonitorRuntime monitorRuntime(MonitorDefinitions definitions, CheckRunner runner, TelemetryService telemetry,
                                  ConnectionPools pools, SecretResolver secrets, ProbeScheduler scheduler,
                                  EventBus bus, Clock clock) {
        return new MonitorRuntime(definitions, runner, telemetry, pools, secrets, scheduler, bus,
                new CircuitBreaker(clock, 3, Duration.ofMinutes(1)), new TargetLimiter(1));
    }

    @Bean(destroyMethod = "stop")
    ProbeWorkers probeWorkers(BlockingQueue<String> probeQueue, ProbeScheduler scheduler, MonitorRuntime runtime) {
        return new ProbeWorkers(probeQueue, scheduler, runtime::runCheck);
    }
}
