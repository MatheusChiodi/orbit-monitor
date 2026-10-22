package io.orbit.probe.cert;

import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.http.SsrfGuard;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetAddress;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-05 TLS certificate fetcher (days left, issuer, chain, trust)")
class TlsCertificateFetcherTest {

    @TempDir
    static Path dir;
    private static TestTlsServer server;
    private static final SsrfGuard GUARD = new SsrfGuard(host -> List.of(InetAddress.getLoopbackAddress()), Set.of());

    @BeforeAll
    static void start() throws Exception {
        server = TestTlsServer.start(dir, 20);
    }

    @AfterAll
    static void stop() throws Exception {
        server.close();
    }

    @Test
    @DisplayName("reads days left, subject and issuer; a self-signed certificate is reported as not trusted")
    void selfSigned() throws Exception {
        TlsCertificateFetcher fetcher = new TlsCertificateFetcher(GUARD, Clock.systemUTC());

        TlsCertificateFetcher.CertificateInfo info = fetcher.fetch("localhost", server.port(), Duration.ofSeconds(5));

        assertThat(info.daysLeft()).isBetween(18L, 20L);
        assertThat(info.subject()).contains("CN=localhost");
        assertThat(info.issuer()).contains("CN=localhost");
        assertThat(info.chainLength()).isEqualTo(1);
        assertThat(info.trusted()).isFalse();
        assertThat(info.trustError()).isNotBlank();
    }

    @Test
    @DisplayName("a certificate the trust store accepts for the host name is trusted")
    void trusted() throws Exception {
        TlsCertificateFetcher fetcher = new TlsCertificateFetcher(GUARD, Clock.systemUTC(),
                server.trustingThisServer());

        TlsCertificateFetcher.CertificateInfo info = fetcher.fetch("localhost", server.port(), Duration.ofSeconds(5));

        assertThat(info.trusted()).isTrue();
        assertThat(info.trustError()).isNull();
    }

    @Test
    @DisplayName("the SSRF guard runs before connecting")
    void guarded() {
        SsrfGuard metadata = new SsrfGuard(host -> List.of(InetAddress.getByName("169.254.169.254")), Set.of());
        TlsCertificateFetcher fetcher = new TlsCertificateFetcher(metadata, Clock.systemUTC());
        assertThatThrownBy(() -> fetcher.fetch("metadata.example", 443, Duration.ofSeconds(1)))
                .isInstanceOf(SsrfBlockedException.class);
    }
}
