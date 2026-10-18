package io.orbit.api.runtime;

import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.condition.Operand;
import io.orbit.monitor.condition.Operator;
import io.orbit.monitor.condition.Placeholder;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorKind;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.probe.CheckResult;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * The single number the wall shows for a monitor ({@code QTY = 347 · rule QTY < 200}): the value of
 * the first numeric comparison rule, or latency (HTTP) / first number of the first row (SQL).
 * Values are taken from the already masked check result.
 */
public record PrimaryValue(Double value, Rule rule, String unit) {

    /** Main rule shown on the wall, e.g. {@code PENDING_QTY < 200}. */
    public record Rule(String field, String operator, double limit) {
    }

    private static final Set<Operator> COMPARISONS = Set.of(Operator.LT, Operator.LE, Operator.GT, Operator.GE,
            Operator.EQ, Operator.NE);
    private static final Set<Placeholder> DURATIONS = Set.of(Placeholder.RESPONSE_TIME, Placeholder.EXEC_TIME);

    public static PrimaryValue of(MonitorDef definition, CheckResult check) {
        Optional<Condition> main = definition.parsedConditions().stream().filter(PrimaryValue::isNumericComparison)
                .filter(c -> c.placeholder() != Placeholder.STATUS).findFirst();
        if (main.isPresent()) {
            Condition c = main.get();
            Rule rule = new Rule(c.path() != null ? c.path() : c.placeholder().name(), c.operator().symbol(), limit(c));
            String unit = DURATIONS.contains(c.placeholder()) ? "ms" : null;
            Double value = check.error() != null ? null : valueOf(check.conditions(), c);
            return new PrimaryValue(value, rule, unit);
        }
        if (check.error() != null) {
            return new PrimaryValue(null, null, definition.kind() == MonitorKind.HTTP ? "ms" : null);
        }
        if (definition.kind() == MonitorKind.HTTP) {
            return new PrimaryValue((double) check.latencyMs(), null, "ms");
        }
        return new PrimaryValue(firstNumber(check.payload()), null, null);
    }

    private static boolean isNumericComparison(Condition c) {
        return COMPARISONS.contains(c.operator())
                && (c.operand() instanceof Operand.NumberOperand || c.operand() instanceof Operand.DurationOperand);
    }

    private static double limit(Condition c) {
        return switch (c.operand()) {
            case Operand.NumberOperand n -> n.value().doubleValue();
            case Operand.DurationOperand d -> d.value().toMillis();
            default -> 0;
        };
    }

    private static Double valueOf(List<ConditionResult> results, Condition condition) {
        return results.stream()
                .filter(r -> r.condition().expression().equals(condition.expression()))
                .findFirst()
                .map(r -> number(r.actual()))
                .orElse(null);
    }

    private static Double firstNumber(Object payload) {
        if (payload instanceof ResultPayload result && !result.rows().isEmpty()) {
            return result.rows().getFirst().stream().map(PrimaryValue::number).filter(v -> v != null).findFirst()
                    .orElse(null);
        }
        return null;
    }

    private static Double number(Object value) {
        return value instanceof Number n ? n.doubleValue() : null;
    }
}
