package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;

import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Evaluates conditions against a result through a {@code Map<Operator, ConditionEvaluator>}.
 * Final state: DOWN if a DOWN condition failed, WARN if a WARN condition failed, OK otherwise.
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
            return new ConditionResult(condition, false, null, label(condition) + " has no value in the result");
        }
        Object value = actual.get();
        try {
            boolean passed = evaluators.get(condition.operator()).test(value, condition.operand(), clock);
            String message = passed ? "ok" : label(condition) + " = " + value + " · rule " + condition.expression();
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

    /**
     * Evaluates with hysteresis: while the monitor is WARN or DOWN, thresholds are tightened by
     * {@code hysteresisRatio} so recovery needs a margin beyond the limit.
     */
    public Evaluation evaluateAll(List<Condition> conditions, EvaluationContext context, MonitorState previous,
                                  double hysteresisRatio) {
        boolean unhealthy = previous == MonitorState.WARN || previous == MonitorState.DOWN;
        if (!unhealthy || hysteresisRatio <= 0) {
            return evaluateAll(conditions, context);
        }
        return evaluateAll(conditions.stream().map(c -> Hysteresis.tighten(c, hysteresisRatio)).toList(), context);
    }

    private static String label(Condition c) {
        return "[" + c.placeholder() + "]" + (c.path() == null ? "" : "." + c.path());
    }
}
