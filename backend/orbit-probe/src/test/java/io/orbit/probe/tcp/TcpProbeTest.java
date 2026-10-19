package io.orbit.probe.tcp;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.net.ServerSocket;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-01 TCP probe")
class TcpProbeTest {

    private final TcpProbe probe = new TcpProbe();

    @Test
    @DisplayName("an open port reports connect time")
    void openPort() throws Exception {
        try (ServerSocket server = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            TcpProbe.TcpResult r = probe.check("127.0.0.1", server.getLocalPort(), Duration.ofSeconds(2));
            assertThat(r.open()).isTrue();
            assertThat(r.failure()).isNull();
            assertThat(r.connectMs()).isGreaterThanOrEqualTo(0);
        }
    }

    @Test
    @DisplayName("a closed port is refused, not a timeout")
    void refused() throws Exception {
        int port;
        try (ServerSocket server = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            port = server.getLocalPort();
        }
        TcpProbe.TcpResult r = probe.check("127.0.0.1", port, Duration.ofSeconds(2));
        assertThat(r.open()).isFalse();
        assertThat(r.failure()).isEqualTo(TcpProbe.Failure.REFUSED);
    }

    @Test
    @DisplayName("a non-routable address times out within the budget")
    void timeout() {
        long start = System.nanoTime();
        TcpProbe.TcpResult r = probe.check("10.255.255.1", 9, Duration.ofMillis(300));
        assertThat(r.failure()).isEqualTo(TcpProbe.Failure.TIMEOUT);
        assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(2));
    }

    @Test
    @DisplayName("an unknown host is reported as unresolved")
    void unresolved() {
        assertThat(probe.check("does-not-exist.invalid", 80, Duration.ofSeconds(1)).failure())
                .isEqualTo(TcpProbe.Failure.UNRESOLVED);
    }
}
