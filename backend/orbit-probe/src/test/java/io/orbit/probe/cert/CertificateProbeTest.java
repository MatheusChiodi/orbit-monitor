package io.orbit.probe.cert;

import com.sun.net.httpserver.HttpServer;
import io.orbit.common.MonitorState;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.SsrfGuard;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-05 certificate and RDAP domain expiry check")
class CertificateProbeTest {

    private static final Instant NOW = Instant.parse("2026-10-22T12:00:00Z");
    private static final SsrfGuard GUARD = new SsrfGuard(host -> List.of(InetAddress.getLoopbackAddress()), Set.of());

    @TempDir
    Path dir;
    private HttpServer rdap;
    private final AtomicInteger rdapCalls = new AtomicInteger();
    private String rdapBase;

    @BeforeEach
    void start() throws IOException {
        rdap = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        rdap.createContext("/domain/", ex -> {
            rdapCalls.incrementAndGet();
            String domain = ex.getRequestURI().getPath().substring("/domain/".length());
            String body = domain.equals("soon.example")
                    ? "{\"events\":[{\"eventAction\":\"expiration\",\"eventDate\":\"2026-11-01T00:00:00Z\"}]}"
                    : "{\"errorCode\":404}";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(domain.equals("soon.example") ? 200 : 404, bytes.length);
            ex.getResponseBody().write(bytes);
            ex.close();
        });
        rdap.start();
        rdapBase = "http://localhost:" + rdap.getAddress().getPort() + "/domain/";
    }

    @AfterEach
    void stop() {
        rdap.stop(0);
    }

    private CertificateProbe probe(Clock clock) {
        return new CertificateProbe(new TlsCertificateFetcher(GUARD, clock),
                new RdapClient(new HttpProbe(GUARD), rdapBase, clock, Duration.ofHours(12)), clock);
    }

    @Test
    @DisplayName("a certificate with 20 days left is WARN at the 30-day step; untrusted is reported")
    void certificateWarn() throws Exception {
        try (TestTlsServer server = TestTlsServer.start(dir, 20)) {
            CertificateProbe.Result result = probe(Clock.systemUTC())
                    .check("localhost", server.port(), null, Duration.ofSeconds(5));

            assertThat(result.certDaysLeft()).isBetween(18L, 20L);
            assertThat(result.state()).isEqualTo(MonitorState.WARN);
            assertThat(result.warningStep()).isEqualTo(30);
            assertThat(result.trusted()).isFalse();
            assertThat(result.error()).isNull();
        }
    }

    @Test
    @DisplayName("domain expiry comes from RDAP, 10 days left is the 14-day step, and RDAP is cached")
    void domainExpiry() {
        CertificateProbe probe = probe(Clock.fixed(NOW, ZoneOffset.UTC));

        CertificateProbe.Result first = probe.check(null, null, "soon.example", Duration.ofSeconds(5));
        CertificateProbe.Result second = probe.check(null, null, "soon.example", Duration.ofSeconds(5));

        assertThat(first.domainDaysLeft()).isEqualTo(9L);
        assertThat(first.state()).isEqualTo(MonitorState.WARN);
        assertThat(first.warningStep()).isEqualTo(14);
        assertThat(second.domainDaysLeft()).isEqualTo(9L);
        assertThat(rdapCalls).hasValue(1);
    }

    @Test
    @DisplayName("an unknown domain or an unreachable host is DOWN with a reason")
    void failures() {
        CertificateProbe probe = probe(Clock.fixed(NOW, ZoneOffset.UTC));

        CertificateProbe.Result unknown = probe.check(null, null, "missing.example", Duration.ofSeconds(5));
        assertThat(unknown.state()).isEqualTo(MonitorState.DOWN);
        assertThat(unknown.error()).contains("RDAP");

        CertificateProbe.Result closed = probe.check("localhost", 1, null, Duration.ofSeconds(2));
        assertThat(closed.state()).isEqualTo(MonitorState.DOWN);
        assertThat(closed.error()).contains("TLS");
    }
}
