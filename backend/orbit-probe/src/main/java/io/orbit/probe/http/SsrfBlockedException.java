package io.orbit.probe.http;

import io.orbit.common.i18n.Localizable;

/** Target rejected by SSRF protection (cloud metadata, private range in block mode, invalid scheme...). */
public class SsrfBlockedException extends RuntimeException implements Localizable {

    private final String key;
    private final transient Object[] args;

    public SsrfBlockedException(String key, String message, Object... args) {
        super(message);
        this.key = "ssrf." + key;
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
