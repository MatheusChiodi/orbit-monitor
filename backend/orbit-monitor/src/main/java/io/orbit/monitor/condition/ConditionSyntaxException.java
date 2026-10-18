package io.orbit.monitor.condition;

/** Expressão de condição mal formada; a mensagem é exibida ao operador no formulário. */
public class ConditionSyntaxException extends RuntimeException {

    public ConditionSyntaxException(String message) {
        super(message);
    }
}
