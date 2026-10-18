package io.orbit.monitor.condition;

/** Outcome of one condition: whether it passed, the observed value and a short explanation. */
public record ConditionResult(Condition condition, boolean passed, Object actual, String message) {
}
