package io.orbit.config;

import java.util.List;

/** Feature-specific validation; returns human-readable errors (empty when valid). */
@FunctionalInterface
public interface ConfigValidator<T> {

    List<String> validate(List<T> items);
}
