package io.orbit.api.runtime;

import io.orbit.common.MonitorState;
import io.orbit.monitor.definition.CheckMonitorDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.probe.CheckPolicy;
import io.orbit.probe.CheckResult;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.cert.CertificateProbe;
import io.orbit.probe.dns.DnsProbe;
import io.orbit.probe.grpc.GrpcHealthProbe;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.multistep.MultiStepHttpProbe;
import io.orbit.probe.kafka.KafkaLagProbe;
import io.orbit.probe.oauth.OAuth2TokenProvider;
import io.orbit.security.vault.SecretResolver;

import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * Runs the newer check types of orbit.checks.json (DNS BE-04, certificate/domain expiry BE-05, gRPC
 * health BE-09, Kafka lag BE-10) through {@link CheckRunner#runMeasured} so conditions and redaction
 * happen at the probe boundary, and resolves OAuth2 tokens for HTTP monitors (BE-08).
 */
public class ExtendedChecks {

    /** Probe adapters; {@code grpcTls} is used for checks with {@code probe.tls = true}. */
    public record Probes(DnsProbe dns, CertificateProbe cert, GrpcHealthProbe grpcPlain, GrpcHealthProbe grpcTls,
                         KafkaSources kafka, OAuth2TokenProvider oauth, HttpProbe http) {
    }

    private final Probes probes;
    private final CheckRunner runner;
    private final SecretResolver secrets;
    private final Consumer<Notice> notices;
    private final Clock clock;
    private final Map<String, Integer> certSteps = new ConcurrentHashMap<>();

    public ExtendedChecks(Probes probes, CheckRunner runner, SecretResolver secrets, Consumer<Notice> notices,
                          Clock clock) {
        this.probes = probes;
        this.runner = runner;
        this.secrets = secrets;
        this.notices = notices;
        this.clock = clock;
    }

    public CheckResult run(CheckMonitorDef check, CheckPolicy policy) {
        Duration timeout = Duration.ofMillis(check.timeoutMs());
        CheckRunner.Measurement measurement = switch (check.type()) {
            case DNS -> dns(check);
            case CERT -> cert(check, timeout);
            case GRPC -> grpc(check, timeout);
            case KAFKA -> kafka(check, timeout);
            default -> throw new IllegalArgumentException("Not an extended check: " + check.type());
        };
        return runner.runMeasured(check.id(), measurement, check.parsedConditions(), policy);
    }

    private CheckRunner.Measurement dns(CheckMonitorDef check) {
        CheckMonitorDef.Probe p = check.probe();
        DnsProbe.RecordType type = DnsProbe.RecordType.valueOf(p.recordType().toUpperCase(Locale.ROOT));
        DnsProbe.DnsResult r = probes.dns().check(check.host(), type, p.expected());
        if (r.error() != null) {
            return new CheckRunner.Measurement(MonitorState.DOWN, r.ms(), r.error(), null, Map.of());
        }
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("ANSWERS", String.join(", ", r.values()));
        values.put("COUNT", r.values().size());
        values.put("BODY", String.join("\n", r.values()));
        String reason = r.matches() ? null : p.expected() == null || p.expected().isBlank()
                ? "DNS " + type + " " + check.host() + " has no answer"
                : "DNS " + type + " " + check.host() + " does not answer " + p.expected();
        return new CheckRunner.Measurement(r.matches() ? MonitorState.OK : MonitorState.DOWN, r.ms(), null, reason,
                values);
    }

    private CheckRunner.Measurement cert(CheckMonitorDef check, Duration timeout) {
        CertificateProbe.Result r = probes.cert().check(check.host(), check.port(), check.probe().domain(), timeout);
        if (r.error() != null) {
            return new CheckRunner.Measurement(MonitorState.DOWN, r.ms(), r.error(), null, Map.of());
        }
        Map<String, Object> values = new LinkedHashMap<>();
        if (r.daysLeft() != null) {
            values.put("CERT_DAYS_LEFT", r.daysLeft());
        }
        if (r.certDaysLeft() != null) {
            values.put("CERT_EXPIRES_AT", String.valueOf(r.certExpiresAt()));
            values.put("ISSUER", r.issuer());
            values.put("SUBJECT", r.subject());
            values.put("CHAIN_LENGTH", r.chainLength());
            values.put("TRUSTED", r.trusted());
        }
        if (r.domainDaysLeft() != null) {
            values.put("DOMAIN_DAYS_LEFT", r.domainDaysLeft());
            values.put("DOMAIN_EXPIRES_AT", String.valueOf(r.domainExpiresAt()));
        }
        notifyStep(check, r);
        String reason = r.state() == MonitorState.OK ? null : Boolean.FALSE.equals(r.trusted())
                && (r.daysLeft() == null || r.daysLeft() > 30)
                ? "Certificate not trusted: " + r.trustError()
                : "Expires in " + r.daysLeft() + " days";
        return new CheckRunner.Measurement(r.state(), r.ms(), null, reason, values);
    }

    /** Notifies once per crossed step (30, 14, 7); a renewal resets the steps. */
    private void notifyStep(CheckMonitorDef check, CertificateProbe.Result r) {
        Integer step = r.warningStep();
        if (step == null) {
            certSteps.remove(check.id());
            return;
        }
        Integer previous = certSteps.put(check.id(), step);
        if (previous == null || step < previous) {
            notices.accept(new Notice("cert.warning", check.id(), "notice.cert.warning",
                    List.of(check.name(), r.daysLeft(), step), clock.instant()));
        }
    }

    private CheckRunner.Measurement grpc(CheckMonitorDef check, Duration timeout) {
        CheckMonitorDef.Probe p = check.probe();
        GrpcHealthProbe probe = p.useTls() ? probes.grpcTls() : probes.grpcPlain();
        GrpcHealthProbe.Result r = probe.check(check.host() + ":" + check.port(), p.service(), timeout);
        Map<String, Object> values = Map.of("STATUS", r.status().name());
        if (r.state() != MonitorState.OK && r.status() == GrpcHealthProbe.ServingStatus.UNKNOWN && r.error() != null) {
            return new CheckRunner.Measurement(MonitorState.DOWN, r.ms(), r.error(), null, values);
        }
        return new CheckRunner.Measurement(r.state(), r.ms(), null, r.error(), values);
    }

    private CheckRunner.Measurement kafka(CheckMonitorDef check, Duration timeout) {
        CheckMonitorDef.Probe p = check.probe();
        long start = System.nanoTime();
        KafkaLagProbe.LagResult r = probes.kafka().probe(p.bootstrapServers(), timeout)
                .lag(p.consumerGroup(), p.topic());
        long ms = Duration.ofNanos(System.nanoTime() - start).toMillis();
        if (r.error() != null) {
            return new CheckRunner.Measurement(MonitorState.DOWN, ms, r.error(), null, Map.of());
        }
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("LAG", r.totalLag());
        values.put("PARTITIONS", r.perPartition().size());
        values.put("MAX_PARTITION_LAG", r.perPartition().values().stream().mapToLong(Long::longValue).max().orElse(0));
        return new CheckRunner.Measurement(MonitorState.OK, ms, null, null, values);
    }

    /** BE-07: multi-step runner whose steps share the monitor's timeout. */
    public MultiStepHttpProbe multiStep(Duration stepTimeout) {
        return new MultiStepHttpProbe(probes.http(), stepTimeout);
    }

    /** Keeps Kafka clients only for bootstrap lists still monitored. */
    public void retainKafka(java.util.Set<String> bootstrapLists) {
        probes.kafka().retain(bootstrapLists);
    }

    /** BE-08: {@code Authorization: Bearer ...} for an HTTP monitor with client credentials. */
    public Optional<String> authorization(HttpMonitorDef http) {
        if (http.oauth() == null) {
            return Optional.empty();
        }
        return Optional.of(probes.oauth().authorization(credentials(http.oauth())));
    }

    /** Drops a cached token after the API answered 401, so the next check asks for a new one. */
    public void rejected(HttpMonitorDef http) {
        if (http.oauth() != null) {
            probes.oauth().invalidate(credentials(http.oauth()));
        }
    }

    private OAuth2TokenProvider.Credentials credentials(HttpMonitorDef.OAuth oauth) {
        return new OAuth2TokenProvider.Credentials(oauth.tokenUrl(), oauth.clientId(),
                secrets.resolve(oauth.clientSecret()), oauth.scope());
    }
}
