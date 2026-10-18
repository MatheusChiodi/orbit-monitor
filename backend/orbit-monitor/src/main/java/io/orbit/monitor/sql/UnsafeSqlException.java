package io.orbit.monitor.sql;

/** SELECT rejected by safe mode; the message tells the operator why. */
public class UnsafeSqlException extends RuntimeException {

    public UnsafeSqlException(String message) {
        super(message);
    }
}
