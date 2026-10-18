package io.orbit.monitor.condition;

/**
 * A parsed health condition. It states the healthy case (Gatus style):
 * when it is not satisfied the monitor takes the state of its {@link Severity}.
 */
public record Condition(
        String expression,
        Placeholder placeholder,
        String path,
        Operator operator,
        Operand operand,
        Severity severity) {
}
