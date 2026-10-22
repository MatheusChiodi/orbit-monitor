package io.orbit.api.config;

import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.SelfMonitor;
import io.orbit.common.MonitorState;
import io.orbit.config.ConfigArchive;
import io.orbit.config.ConfigBackup;
import io.orbit.security.vault.SecretResolver;
import io.orbit.telemetry.TelemetryService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.Scheduled;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.BlockingQueue;

/**
 * BE-50: Micrometer metrics ({@code orbit.checks} by state, {@code orbit.queue.size}), the built-in
 * {@code orbit_self} monitor and the encrypted, rotating backup of the config directory. Metric tags
 * never carry monitor names, hosts or values: only the resulting state. Also the config archive (BE-37).
 */
@Configuration
public class SelfMonitoringBeans {

    private static final Logger LOG = LoggerFactory.getLogger(SelfMonitoringBeans.class);

    /** Check counters by resulting state. */
    public record CheckMetrics(Map<MonitorState, Counter> counters) {
    }

    /** Registers the meters eagerly so they exist (at zero) before the first check. */
    @Bean
    CheckMetrics checkMetrics(MeterRegistry registry, EventBus bus, BlockingQueue<String> probeQueue) {
        Map<MonitorState, Counter> counters = new EnumMap<>(MonitorState.class);
        for (MonitorState state : MonitorState.values()) {
            counters.put(state, Counter.builder("orbit.checks").description("Checks executed, by resulting state")
                    .tag("state", state.name()).register(registry));
        }
        bus.onCheck(result -> counters.get(result.state()).increment());
        Gauge.builder("orbit.queue.size", probeQueue, BlockingQueue::size)
                .description("Checks waiting for a worker").register(registry);
        return new CheckMetrics(Map.copyOf(counters));
    }

    @Bean
    SelfMonitor selfMonitor(HealthEndpoint health, TelemetryService telemetry, Clock clock) {
        return new SelfMonitor(health, telemetry, clock);
    }

    /**
     * Backups live next to the config directory ({@code ~/.orbit/backups}); the whole zip is sealed
     * with the vault key (AES-256-GCM), so a copied backup is useless without {@code master.key}.
     */
    @Bean
    ConfigBackup configBackup(OrbitProperties properties, SecretResolver secrets,
                              @Value("${orbit.backup.keep:7}") int keep) {
        return new ConfigBackup(properties.configDir(), properties.configDir().resolveSibling("backups"), keep,
                bytes -> secrets.seal(Base64.getEncoder().encodeToString(bytes)).encrypted()
                        .getBytes(StandardCharsets.US_ASCII));
    }

    /** BE-37: export/import of the whole config directory, secrets omitted. */
    @Bean
    ConfigArchive configArchive(OrbitProperties properties) {
        return new ConfigArchive(properties.configDir());
    }

    @Bean
    SelfMonitoringJobs selfMonitoringJobs(SelfMonitor self, ConfigBackup backup) {
        return new SelfMonitoringJobs(self, backup);
    }

    /** Scheduled work: self check every 30 s, config backup once a day (first one an hour after start). */
    public static class SelfMonitoringJobs {

        private final SelfMonitor self;
        private final ConfigBackup backup;

        SelfMonitoringJobs(SelfMonitor self, ConfigBackup backup) {
            this.self = self;
            this.backup = backup;
        }

        @Scheduled(initialDelay = 0, fixedDelay = 30_000)
        public void checkSelf() {
            self.check();
        }

        @Scheduled(initialDelayString = "${orbit.backup.initial-delay:PT1H}",
                fixedDelayString = "${orbit.backup.interval:PT24H}")
        public void backUp() {
            try {
                backup.create();
            } catch (RuntimeException e) {
                LOG.warn("Config backup failed: {}", e.getClass().getSimpleName());
            }
        }
    }
}
