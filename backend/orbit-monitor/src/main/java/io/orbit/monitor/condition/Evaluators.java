package io.orbit.monitor.condition;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;

/** Registro padrão {@code Operator -> ConditionEvaluator}. */
final class Evaluators {

    private Evaluators() {
    }

    static Map<Operator, ConditionEvaluator> defaults() {
        Map<Operator, ConditionEvaluator> map = new EnumMap<>(Operator.class);
        map.put(Operator.LT, (a, o, c) -> ValueComparator.compare(a, o, c) < 0);
        map.put(Operator.LE, (a, o, c) -> ValueComparator.compare(a, o, c) <= 0);
        map.put(Operator.GT, (a, o, c) -> ValueComparator.compare(a, o, c) > 0);
        map.put(Operator.GE, (a, o, c) -> ValueComparator.compare(a, o, c) >= 0);
        map.put(Operator.EQ, ValueComparator::matches);
        map.put(Operator.NE, (a, o, c) -> !ValueComparator.matches(a, o, c));
        map.put(Operator.IN, ValueComparator::matches);
        map.put(Operator.BETWEEN, (a, o, c) -> {
            Operand.RangeOperand range = (Operand.RangeOperand) o;
            return ValueComparator.compare(a, range.low(), c) >= 0
                    && ValueComparator.compare(a, range.high(), c) <= 0;
        });
        map.put(Operator.OLDER_THAN,
                (a, o, c) -> ValueComparator.requireInstant(a, c).isBefore(threshold(o, c.instant())));
        map.put(Operator.NEWER_THAN,
                (a, o, c) -> !ValueComparator.requireInstant(a, c).isBefore(threshold(o, c.instant())));
        map.put(Operator.CONTAINS, (a, o, c) -> String.valueOf(a).contains(text(o)));
        return map;
    }

    private static Instant threshold(Operand operand, Instant now) {
        Duration age = ((Operand.DurationOperand) operand).value();
        return now.minus(age);
    }

    private static String text(Operand operand) {
        return switch (operand) {
            case Operand.TextOperand t -> t.value();
            case Operand.NumberOperand n -> n.value().toPlainString();
            default -> throw new IncomparableValuesException("contains espera texto");
        };
    }
}
