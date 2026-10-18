package io.orbit.monitor.sql;

import io.orbit.common.i18n.Localizable;

/** SELECT rejected by safe mode; the message tells the operator why. */
public class UnsafeSqlException extends RuntimeException implements Localizable {

    private final String key;
    private final transient Object[] args;

    public UnsafeSqlException(String key, String message, Object... args) {
        super(message);
        this.key = "sql." + key;
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
