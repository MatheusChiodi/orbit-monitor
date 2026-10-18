package io.orbit.monitor.condition;

/** Valor real e operando de tipos incompatíveis (ex.: texto comparado com número). */
public class IncomparableValuesException extends RuntimeException {

    public IncomparableValuesException(String message) {
        super(message);
    }
}
