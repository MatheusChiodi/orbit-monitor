package io.orbit.api.config;

import io.orbit.api.runtime.EventBus;
import io.orbit.api.runtime.ExtendedChecks;
import io.orbit.api.runtime.KafkaSources;
import io.orbit.api.runtime.SimpleProbes;
import io.orbit.probe.CheckRunner;
import io.orbit.probe.cert.CertificateProbe;
import io.orbit.probe.cert.RdapClient;
import io.orbit.probe.cert.TlsCertificateFetcher;
import io.orbit.probe.dns.DnsProbe;
import io.orbit.probe.dns.JndiDnsResolver;
import io.orbit.probe.grpc.GrpcHealthProbe;
import io.orbit.probe.grpc.GrpcJavaHealthClient;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.oauth.HttpTokenEndpoint;
import io.orbit.probe.oauth.OAuth2TokenProvider;
import io.orbit.security.vault.SecretResolver;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.Duration;

/**
 * Real adapters of the newer probes: JNDI DNS (BE-04), TLS + RDAP (BE-05), OAuth2 token endpoint
 * (BE-08), grpc-java health client (BE-09) and the Kafka Admin API (BE-10). Every network target
 * passes the same SSRF guard as the HTTP probe.
 */
@Configuration
public class ExtendedProbeBeans {

    /** Open gRPC channels, closed on shutdown. */
    public record GrpcClients(GrpcJavaHealthClient plain, GrpcJavaHealthClient tls) implements AutoCloseable {
        @Override
        public void close() {
            plain.close();
            tls.close();
        }
    }

    @Bean(destroyMethod = "close")
    GrpcClients grpcClients(SimpleProbes simpleProbes) {
        return new GrpcClients(new GrpcJavaHealthClient(simpleProbes.guard(), false),
                new GrpcJavaHealthClient(simpleProbes.guard(), true));
    }

    @Bean(destroyMethod = "close")
    KafkaSources kafkaSources(SimpleProbes simpleProbes) {
        return new KafkaSources(simpleProbes.guard());
    }

    @Bean
    ExtendedChecks extendedChecks(SimpleProbes simpleProbes, HttpProbe httpProbe, CheckRunner runner,
                                  SecretResolver secrets, EventBus bus, Clock clock, GrpcClients grpc,
                                  KafkaSources kafka,
                                  @Value("${orbit.dns.server:}") String dnsServer,
                                  @Value("${orbit.rdap.base-url:" + RdapClient.DEFAULT_BASE + "}") String rdapBase) {
        CertificateProbe cert = new CertificateProbe(new TlsCertificateFetcher(simpleProbes.guard(), clock),
                new RdapClient(httpProbe, rdapBase, clock, Duration.ofHours(12)), clock);
        OAuth2TokenProvider oauth = new OAuth2TokenProvider(new HttpTokenEndpoint(httpProbe, Duration.ofSeconds(10)),
                clock, Duration.ofSeconds(30));
        ExtendedChecks.Probes probes = new ExtendedChecks.Probes(
                new DnsProbe(new JndiDnsResolver(dnsServer.isBlank() ? null : dnsServer, Duration.ofSeconds(5))),
                cert, new GrpcHealthProbe(grpc.plain()), new GrpcHealthProbe(grpc.tls()), kafka, oauth, httpProbe);
        return new ExtendedChecks(probes, runner, secrets, bus::publish, clock);
    }
}
