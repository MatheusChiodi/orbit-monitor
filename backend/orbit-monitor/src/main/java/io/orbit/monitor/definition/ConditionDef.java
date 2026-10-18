package io.orbit.monitor.definition;

import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.Severity;

/** A condition as written in the config file: {@code {"expression": "[STATUS] == 200", "level": "DOWN"}}. */
public record ConditionDef(String expression, Severity level) {

    private static final ConditionParser PARSER = new ConditionParser();

    public Condition parse() {
        return PARSER.parse(expression, level == null ? Severity.DOWN : level);
    }
}
