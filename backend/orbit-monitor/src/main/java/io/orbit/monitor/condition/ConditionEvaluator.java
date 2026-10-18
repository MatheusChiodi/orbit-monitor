package io.orbit.monitor.condition;

import java.time.Clock;

/** Avalia um operador sobre o valor real e o operando da condição. */
@FunctionalInterface
public interface ConditionEvaluator {

    /**
     * @throws IncomparableValuesException quando o valor real não pode ser comparado ao operando
     */
    boolean test(Object actual, Operand operand, Clock clock);
}
