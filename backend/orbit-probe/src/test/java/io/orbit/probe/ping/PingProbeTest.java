package io.orbit.probe.ping;

import io.orbit.probe.tcp.TcpProbe;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@Tag("pending")
@DisplayName("BE-02 ping probe")
class PingProbeTest {

    private final TcpProbe tcp = mock(TcpProbe.class);

    @Test
    @DisplayName("uses ICMP when it answers")
    void icmp() {
        PingProbe probe = new PingProbe((host, timeout) -> 12, tcp, 443);
        PingProbe.PingResult r = probe.check("db.internal", Duration.ofSeconds(1));
        assertThat(r).isEqualTo(new PingProbe.PingResult(true, 12, PingProbe.Method.ICMP));
        verifyNoInteractions(tcp);
    }

    @Test
    @DisplayName("falls back to TCP when ICMP is not permitted")
    void tcpFallback() {
        when(tcp.check(anyString(), anyInt(), any())).thenReturn(new TcpProbe.TcpResult(true, 8, null));
        PingProbe probe = new PingProbe((host, timeout) -> -1, tcp, 443);
        assertThat(probe.check("db.internal", Duration.ofSeconds(1)))
                .isEqualTo(new PingProbe.PingResult(true, 8, PingProbe.Method.TCP));
    }

    @Test
    @DisplayName("unreachable when both fail")
    void unreachable() {
        when(tcp.check(anyString(), anyInt(), any()))
                .thenReturn(new TcpProbe.TcpResult(false, 0, TcpProbe.Failure.TIMEOUT));
        PingProbe probe = new PingProbe((host, timeout) -> -1, tcp, 443);
        assertThat(probe.check("db.internal", Duration.ofSeconds(1)).reachable()).isFalse();
    }
}
