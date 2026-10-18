package io.orbit.monitor.condition;

/**
 * Condição de saúde já interpretada. Expressa o estado saudável (estilo Gatus):
 * quando a condição não é satisfeita, o monitor assume o estado do seu {@link Severity}.
 */
public record Condition(
        String expression,
        Placeholder placeholder,
        String path,
        Operator operator,
        Operand operand,
        Severity severity) {
}
