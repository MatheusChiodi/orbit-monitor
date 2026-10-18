package io.orbit.probe.sql;

/** SQL check failed on the target (timeout, syntax error, connection problem). */
public class SqlProbeException extends RuntimeException {

    private final boolean timeout;

    public SqlProbeException(String message, boolean timeout, Throwable cause) {
        super(message, cause);
        this.timeout = timeout;
    }

    public boolean isTimeout() {
        return timeout;
    }
}
