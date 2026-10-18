package io.orbit.monitor.condition;

import java.time.Clock;

/** Applies one operator to the actual value and the condition operand. */
@FunctionalInterface
public interface ConditionEvaluator {

    /**
     * @throws IncomparableValuesException when the actual value cannot be compared to the operand
     */
    boolean test(Object actual, Operand operand, Clock clock);
}
