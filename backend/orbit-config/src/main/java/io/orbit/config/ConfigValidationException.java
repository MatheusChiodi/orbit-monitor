package io.orbit.config;

import java.util.List;

/** Configuration rejected before writing; nothing on disk changed. */
public class ConfigValidationException extends RuntimeException {

    private final List<String> errors;

    public ConfigValidationException(List<String> errors) {
        super("Invalid configuration: " + String.join("; ", errors));
        this.errors = List.copyOf(errors);
    }

    public List<String> errors() {
        return errors;
    }
}
