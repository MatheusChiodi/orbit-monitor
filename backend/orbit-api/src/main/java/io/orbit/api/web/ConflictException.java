package io.orbit.api.web;

import java.util.Map;

/**
 * A change refused because other items still depend on the target (a group with monitors, a connection
 * used by SELECT monitors). Answered as 409 with a specific {@code code}, a translated detail and the
 * dependants as extra Problem Details properties, so the client can offer the way out.
 */
public class ConflictException extends RuntimeException {

    private final String code;
    private final transient Object[] args;
    private final transient Map<String, Object> properties;

    public ConflictException(String code, String fallback, Map<String, Object> properties, Object... args) {
        super(fallback);
        this.code = code;
        this.args = args;
        this.properties = Map.copyOf(properties);
    }

    public String code() {
        return code;
    }

    public Object[] args() {
        return args.clone();
    }

    public Map<String, Object> properties() {
        return properties;
    }
}
