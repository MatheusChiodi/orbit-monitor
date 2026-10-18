package io.orbit.monitor.condition;

/** Actual value and operand have incompatible types (e.g. text compared with a number). */
public class IncomparableValuesException extends RuntimeException {

    public IncomparableValuesException(String message) {
        super(message);
    }
}
