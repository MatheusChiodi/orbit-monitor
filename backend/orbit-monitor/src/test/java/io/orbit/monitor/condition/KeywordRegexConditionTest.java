package io.orbit.monitor.condition;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.Clock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("pending")
@DisplayName("BE-06 HTTP keyword/regex match")
class KeywordRegexConditionTest {

    private final ConditionParser parser = new ConditionParser();
    private final ConditionEngine engine = new ConditionEngine(Clock.systemUTC());

    private boolean eval(String expression, String body) {
        var ctx = new MapEvaluationContext().with(Placeholder.BODY, body);
        return engine.evaluate(parser.parse(expression, Severity.DOWN), ctx).passed();
    }

    @Test
    @DisplayName("not contains passes when the keyword is absent")
    void notContains() {
        assertThat(eval("[BODY] not contains \"error\"", "{\"status\":\"UP\"}")).isTrue();
        assertThat(eval("[BODY] not contains \"error\"", "fatal error")).isFalse();
    }

    @Test
    @DisplayName("matches applies a regular expression to the body")
    void matches() {
        assertThat(eval("[BODY] matches \"\\\"status\\\":\\\"(UP|OK)\\\"\"", "{\"status\":\"UP\"}")).isTrue();
        assertThat(eval("[BODY] matches \"^pong$\"", "ping")).isFalse();
    }

    @Test
    @DisplayName("an invalid regex is a syntax error at save time")
    void invalidRegex() {
        assertThatThrownBy(() -> parser.parse("[BODY] matches \"(unclosed\"", Severity.DOWN))
                .isInstanceOf(ConditionSyntaxException.class);
    }

    @Test
    @DisplayName("catastrophic patterns are cut off instead of hanging the worker")
    void boundedRegex() {
        String body = "a".repeat(5_000) + "!";
        long start = System.nanoTime();
        eval("[BODY] matches \"^(a+)+$\"", body);
        assertThat((System.nanoTime() - start) / 1_000_000).isLessThan(2_000);
    }
}
