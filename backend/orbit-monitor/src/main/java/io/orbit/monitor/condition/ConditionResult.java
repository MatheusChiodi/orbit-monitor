package io.orbit.monitor.condition;

/** Resultado de uma condição: passou ou não, com o valor real observado e uma explicação curta. */
public record ConditionResult(Condition condition, boolean passed, Object actual, String message) {
}
