package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;

import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Avalia condições sobre um resultado usando um {@code Map<Operator, ConditionEvaluator>}.
 * Estado final: DOWN se alguma condição DOWN falhou, WARN se alguma WARN falhou, senão OK.
 */
public class ConditionEngine {

    private final Clock clock;
    private final Map<Operator, ConditionEvaluator> evaluators;

    public ConditionEngine(Clock clock) {
        this(clock, Evaluators.defaults());
    }

    public ConditionEngine(Clock clock, Map<Operator, ConditionEvaluator> evaluators) {
        this.clock = clock;
        this.evaluators = new EnumMap<>(evaluators);
    }

    public ConditionEvaluator evaluatorFor(Operator operator) {
        return evaluators.get(operator);
    }

    public ConditionResult evaluate(Condition condition, EvaluationContext context) {
        Optional<Object> actual = context.resolve(condition.placeholder(), condition.path());
        if (actual.isEmpty()) {
            return new ConditionResult(condition, false, null, label(condition) + " sem valor no resultado");
        }
        Object value = actual.get();
        try {
            boolean passed = evaluators.get(condition.operator()).test(value, condition.operand(), clock);
            String message = passed ? "ok" : label(condition) + " = " + value + " · regra " + condition.expression();
            return new ConditionResult(condition, passed, value, message);
        } catch (IncomparableValuesException e) {
            return new ConditionResult(condition, false, value, e.getMessage());
        }
    }

    public Evaluation evaluateAll(List<Condition> conditions, EvaluationContext context) {
        List<ConditionResult> results = conditions.stream().map(c -> evaluate(c, context)).toList();
        MonitorState state = results.stream()
                .filter(r -> !r.passed())
                .map(r -> r.condition().severity().stateOnFailure())
                .reduce(MonitorState.OK, MonitorState::worst);
        return new Evaluation(state, results);
    }

    private static String label(Condition c) {
        return "[" + c.placeholder() + "]" + (c.path() == null ? "" : "." + c.path());
    }
}
