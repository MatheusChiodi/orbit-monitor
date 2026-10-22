package io.orbit.api.config;

import io.orbit.api.runtime.ConnectionPools;
import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.MonitorRuntime;
import io.orbit.api.runtime.SimpleProbes;
import io.orbit.probe.http.HostResolver;
import io.orbit.probe.http.SsrfGuard;
import io.orbit.probe.ping.PingProbe;
import io.orbit.probe.push.PushRegistry;
import io.orbit.probe.tcp.TcpProbe;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.resilience.CircuitBreaker;
import io.orbit.probe.resilience.TargetLimiter;
import io.orbit.probe.schedule.ProbeScheduler;
import io.orbit.probe.schedule.ProbeWorkers;
import io.orbit.security.vault.SecretResolver;
import io.orbit.telemetry.TelemetryService;
import io.orbit.workspace.variable.VariableService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.Duration;
import java.util.HashSet;
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
                                  EventBus bus, Clock clock, SimpleProbes simpleProbes, VariableService variables) {
        return new MonitorRuntime(definitions, runner, telemetry, pools, secrets, scheduler, bus,
                new CircuitBreaker(clock, 3, Duration.ofMinutes(1)), new TargetLimiter(1), simpleProbes,
                variables::resolver);
    }

    @Bean
    PushRegistry pushRegistry(Clock clock) {
        return new PushRegistry(clock);
    }

    @Bean
    SimpleProbes simpleProbes(PushRegistry pushRegistry, OrbitProperties properties) {
        TcpProbe tcp = new TcpProbe();
        return new SimpleProbes(tcp, new PingProbe(PingProbe.IcmpPinger.system(), tcp, 443), pushRegistry,
                new SsrfGuard(HostResolver.system(), new HashSet<>(properties.http().allowlist()),
                        properties.http().blockPrivate()));
    }

    @Bean(destroyMethod = "stop")
    ProbeWorkers probeWorkers(BlockingQueue<String> probeQueue, ProbeScheduler scheduler, MonitorRuntime runtime) {
        return new ProbeWorkers(probeQueue, scheduler, runtime::runCheck);
    }
}
