package io.orbit.monitor.condition;

import io.orbit.common.MonitorState;

import java.util.List;

/** Evaluation of all conditions of a monitor against one result. */
public record Evaluation(MonitorState state, List<ConditionResult> results) {

    public Evaluation {
        results = List.copyOf(results);
    }

    public List<ConditionResult> failures() {
        return results.stream().filter(r -> !r.passed()).toList();
    }
}
