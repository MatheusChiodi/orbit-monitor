package io.orbit.probe.ping;

import io.orbit.probe.tcp.TcpProbe;

import java.io.IOException;
import java.net.InetAddress;
import java.time.Duration;

/** BE-02: ICMP ping with a TCP fallback when ICMP is not permitted on the machine. */
public class PingProbe {

    /** ICMP port; the system implementation uses {@code InetAddress.isReachable}. */
    @FunctionalInterface
    public interface IcmpPinger {
        /** @return round-trip ms, or -1 when ICMP is not permitted or there was no reply */
        long ping(String host, Duration timeout);

        static IcmpPinger system() {
            return (host, timeout) -> {
                long start = System.nanoTime();
                try {
                    boolean reachable = InetAddress.getByName(host).isReachable((int) timeout.toMillis());
                    return reachable ? (System.nanoTime() - start) / 1_000_000 : -1;
                } catch (IOException e) {
                    return -1;
                }
            };
        }
    }

    public enum Method { ICMP, TCP }

    public record PingResult(boolean reachable, long ms, Method method) {
    }

    private final IcmpPinger icmp;
    private final TcpProbe tcp;
    private final int fallbackPort;

    public PingProbe(IcmpPinger icmp, TcpProbe tcp, int fallbackPort) {
        this.icmp = icmp;
        this.tcp = tcp;
        this.fallbackPort = fallbackPort;
    }

    public PingResult check(String host, Duration timeout) {
        long rtt = icmp.ping(host, timeout);
        if (rtt >= 0) {
            return new PingResult(true, rtt, Method.ICMP);
        }
        TcpProbe.TcpResult fallback = tcp.check(host, fallbackPort, timeout);
        return new PingResult(fallback.open(), fallback.connectMs(), Method.TCP);
    }
}
