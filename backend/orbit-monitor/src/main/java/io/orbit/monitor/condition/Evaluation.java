package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;

import java.util.List;

/** Avaliação de todas as condições de um monitor sobre um resultado. */
public record Evaluation(MonitorState state, List<ConditionResult> results) {

    public Evaluation {
        results = List.copyOf(results);
    }

    public List<ConditionResult> failures() {
        return results.stream().filter(r -> !r.passed()).toList();
    }
}
