package io.orbit.monitor.condition;

import io.orbit.common.i18n.Localizable;

/** Malformed condition expression; the message is shown to the operator in the editor. */
public class ConditionSyntaxException extends RuntimeException implements Localizable {

    private final String key;
    private final transient Object[] args;

    public ConditionSyntaxException(String key, String message, Object... args) {
        super(message);
        this.key = "condition." + key;
        this.args = args;
    }

    @Override
    public String messageKey() {
        return key;
    }

    @Override
    public Object[] messageArgs() {
        return args.clone();
    }
}
