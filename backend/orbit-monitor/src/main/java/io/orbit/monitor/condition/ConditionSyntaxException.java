package io.orbit.monitor.condition;

/** Malformed condition expression; the message is shown to the operator in the editor. */
public class ConditionSyntaxException extends RuntimeException {

    public ConditionSyntaxException(String message) {
        super(message);
    }
}
