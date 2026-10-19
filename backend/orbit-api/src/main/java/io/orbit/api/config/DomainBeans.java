package io.orbit.api.config;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.IncidentService;
import io.orbit.api.runtime.EventBus;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigMapper;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.LimitWrapper;
import io.orbit.monitor.sql.SelectValidator;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.http.HostResolver;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.SsrfGuard;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.security.access.AccessPolicy;
import io.orbit.security.audit.AuditLog;
import io.orbit.security.settings.OrbitSettings;
import io.orbit.security.settings.SettingsService;
import io.orbit.security.vault.MasterKey;
import io.orbit.security.vault.SecretCipher;
import io.orbit.security.vault.SecretResolver;
import io.orbit.telemetry.HeartbeatStore;
import io.orbit.telemetry.StateTracker;
import io.orbit.telemetry.TelemetryService;
import io.orbit.workspace.Group;
import io.orbit.workspace.GroupService;
import io.orbit.workspace.layout.WallLayoutService;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;
import java.time.Duration;
import java.util.HashSet;
import java.util.List;

/** Wires the plain-Java domain modules into Spring; domains themselves know nothing about Spring. */
@Configuration
@EnableScheduling
@EnableConfigurationProperties(OrbitProperties.class)
public class DomainBeans {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    SensitiveDataRedactor sensitiveDataRedactor() {
        return new SensitiveDataRedactor();
    }

    @Bean
    PayloadRedactor payloadRedactor(SensitiveDataRedactor redactor) {
        return new PayloadRedactor(redactor);
    }

    @Bean
    SelectValidator selectValidator() {
        return new SelectValidator();
    }

    @Bean
    SqlProbe sqlProbe(SelectValidator validator) {
        return new SqlProbe(validator, new LimitWrapper());
    }

    @Bean
    HttpProbe httpProbe(OrbitProperties properties) {
        return new HttpProbe(new SsrfGuard(HostResolver.system(), new HashSet<>(properties.http().allowlist()),
                properties.http().blockPrivate()));
    }

    @Bean
    ConditionEngine conditionEngine(Clock clock) {
        return new ConditionEngine(clock);
    }

    @Bean
    CheckRunner checkRunner(HttpProbe httpProbe, SqlProbe sqlProbe, ConditionEngine engine,
                            PayloadRedactor redactor, Clock clock) {
        return new CheckRunner(httpProbe, sqlProbe, engine, redactor, clock);
    }

    @Bean
    HeartbeatStore heartbeatStore(OrbitProperties properties) {
        return new HeartbeatStore(properties.history(), 20_000);
    }

    @Bean
    EventBus eventBus() {
        return new EventBus();
    }

    @Bean
    TelemetryService telemetryService(HeartbeatStore store, EventBus bus) {
        return new TelemetryService(store, new StateTracker(), bus::publish);
    }

    @Bean
    IncidentService incidentService(MonitorDefinitions definitions, EventBus bus, Clock clock) {
        IncidentService service = new IncidentService(new InMemoryIncidentRepository(),
                id -> definitions.monitor(id).map(MonitorDef::openOnWarn).orElse(false), bus::publish, clock,
                Duration.ofMinutes(5));
        bus.onStateChange(service);
        return service;
    }

    @Bean
    AuditLog auditLog(SensitiveDataRedactor redactor, Clock clock, OrbitProperties properties) {
        return new AuditLog(redactor, clock, properties.history(),
                org.slf4j.LoggerFactory.getLogger("orbit.audit")::info);
    }

    @Bean
    SecretResolver secretResolver(OrbitProperties properties) {
        return new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(properties.masterKey())), System::getenv);
    }

    @Bean
    MonitorDefinitions monitorDefinitions(OrbitProperties properties) {
        return MonitorDefinitions.open(properties.configDir(), ConfigMapper.create());
    }

    @Bean
    GroupService groupService(OrbitProperties properties, Clock clock) {
        return new GroupService(new ConfigFile<>(properties.configDir(), "groups", Group.class, ConfigMapper.create(),
                GroupService.VALIDATOR), clock);
    }

    @Bean
    WallLayoutService wallLayoutService(OrbitProperties properties, Clock clock) {
        return new WallLayoutService(new ConfigFile<>(properties.configDir(), "layouts", WallLayoutService.Layout.class,
                ConfigMapper.create(), items -> List.of()), clock);
    }

    /** Live access policy: orbit.settings.json when it has an access section, application properties otherwise. */
    @Bean
    SettingsService settingsService(OrbitProperties properties, Clock clock) {
        OrbitProperties.Access access = properties.access();
        AccessPolicy fallback = new AccessPolicy(access.mode(), access.cidrs()).withLanAcknowledge(access.lanAcknowledge());
        return new SettingsService(new ConfigFile<>(properties.configDir(), "settings", OrbitSettings.class,
                ConfigMapper.create(), SettingsService.VALIDATOR), fallback, clock);
    }
}
