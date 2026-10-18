package io.orbit.monitor.sql;

/** SELECT recusado pelo modo seguro; a mensagem explica o motivo ao operador. */
public class UnsafeSqlException extends RuntimeException {

    public UnsafeSqlException(String message) {
        super(message);
    }
}
