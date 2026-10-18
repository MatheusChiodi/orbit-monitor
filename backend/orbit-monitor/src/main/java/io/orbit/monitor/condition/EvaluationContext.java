package io.orbit.monitor.condition;

import java.util.Optional;

/** Source of actual values (HTTP or SQL result) looked up during evaluation. */
public interface EvaluationContext {

    Optional<Object> resolve(Placeholder placeholder, String path);
}
