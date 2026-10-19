package io.orbit.probe.tcp;

import java.time.Duration;

/** BE-01: TCP port check with connect time; distinguishes refused from timeout. */
public class TcpProbe {

    /** Why a connection did not open. */
    public enum Failure { REFUSED, TIMEOUT, UNRESOLVED }

    /** @param failure null when the port is open */
    public record TcpResult(boolean open, long connectMs, Failure failure) {
    }

    public TcpResult check(String host, int port, Duration timeout) {
        throw new UnsupportedOperationException("BE-01 TCP probe is not implemented yet");
    }
}
