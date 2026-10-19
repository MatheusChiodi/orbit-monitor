package io.orbit.probe.ping;

import io.orbit.probe.tcp.TcpProbe;

import java.time.Duration;

/** BE-02: ICMP ping with a TCP fallback when ICMP is not permitted on the machine. */
public class PingProbe {

    /** ICMP port; the system implementation uses {@code InetAddress.isReachable}. */
    @FunctionalInterface
    public interface IcmpPinger {
        /** @return round-trip ms, or -1 when ICMP is not permitted or there was no reply */
        long ping(String host, Duration timeout);
    }

    public enum Method { ICMP, TCP }

    public record PingResult(boolean reachable, long ms, Method method) {
    }

    public PingProbe(IcmpPinger icmp, TcpProbe tcp, int fallbackPort) {
    }

    public PingResult check(String host, Duration timeout) {
        throw new UnsupportedOperationException("BE-02 ping probe is not implemented yet");
    }
}
