package io.orbit.api.web;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MonitorRequestMapperTest {

    private static MonitorRequest.ConditionRequest c(String field, String op, String value) {
        return new MonitorRequest.ConditionRequest(field, op, value, null, "WARN");
    }

    @Test
    void buildsExpressionsFromFormFields() {
        assertThat(MonitorRequestMapper.expression(c("PENDING_QTY", "<", "200"), "[COL]."))
                .isEqualTo("[COL].PENDING_QTY < 200");
        assertThat(MonitorRequestMapper.expression(c("$.queue.size", "<=", "10"), "[BODY]."))
                .isEqualTo("[BODY].queue.size <= 10");
        assertThat(MonitorRequestMapper.expression(c("[STATUS]", "==", "200"), "[BODY]."))
                .isEqualTo("[STATUS] == 200");
        assertThat(MonitorRequestMapper.expression(c("LAST_BATCH_AT", "older_than", "10min"), "[COL]."))
                .isEqualTo("[COL].LAST_BATCH_AT older than 10min");
    }

    @Test
    void reachabilityConditionsTargetTheResponseTime() {
        assertThat(MonitorRequestMapper.expression(c("latency", ">", "800ms"), "[RESPONSE_TIME]"))
                .isEqualTo("[RESPONSE_TIME] > 800ms");
    }

    @Test
    void explicitExpressionWins() {
        var condition = new MonitorRequest.ConditionRequest("x", "<", "1", "[ROWS] == 0", "DOWN");
        assertThat(MonitorRequestMapper.expression(condition, "[COL].")).isEqualTo("[ROWS] == 0");
    }

    @Test
    void incompleteConditionIsRejected() {
        assertThatThrownBy(() -> MonitorRequestMapper.expression(c("QTY", null, "1"), "[COL]."))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
