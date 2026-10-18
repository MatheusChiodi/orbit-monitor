package io.orbit.monitor.privacy;

import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.condition.ConditionEngine;
import io.orbit.monitor.condition.ConditionParser;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.condition.Severity;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.sql.ColumnType;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.monitor.sql.SqlEvaluationContext;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class PayloadRedactorTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    private final PayloadRedactor redactor = new PayloadRedactor(new SensitiveDataRedactor());

    @Test
    void redactsSqlRowsByColumnNameAndValue() {
        var payload = new ResultPayload(
                List.of(new ResultColumn("CARD_NUMBER", ColumnType.TEXT, "VARCHAR"),
                        new ResultColumn("NOTE", ColumnType.TEXT, "VARCHAR"),
                        new ResultColumn("PENDING_QTY", ColumnType.NUMBER, "NUMBER")),
                List.of(List.of(TEST_PAN, "paid with " + TEST_PAN, 12)),
                40L, true);

        ResultPayload masked = redactor.redact(payload);

        assertThat(masked.rows().getFirst()).containsExactly(
                "•••• •••• •••• 1111", "paid with •••• •••• •••• 1111", 12);
        assertThat(masked.columns()).isEqualTo(payload.columns());
        assertThat(masked.ms()).isEqualTo(40L);
        assertThat(masked.truncated()).isTrue();
    }

    @Test
    void redactsJsonBodyByKeyAndValueKeepingStructure() {
        String body = "{\"status\":\"UP\",\"customer\":{\"email\":\"ana@corp.com\",\"cvv\":\"123\"},"
                + "\"items\":[{\"pan\":\"" + TEST_PAN + "\",\"qty\":2}]}";
        var response = new HttpResponseSnapshot(200, 10L, body, Map.of(), null);

        String masked = redactor.redact(response).body();

        assertThat(masked).doesNotContain(TEST_PAN, "ana@corp.com", "\"123\"");
        assertThat(masked).contains("\"status\":\"UP\"", "\"qty\":2", "[REDACTED]", "a•••@c•••.com");
    }

    @Test
    void redactsPlainTextBody() {
        var response = new HttpResponseSnapshot(200, 10L, "card " + TEST_PAN, Map.of(), null);
        assertThat(redactor.redact(response).body()).isEqualTo("card •••• •••• •••• 1111");
    }

    @Test
    void redactsSensitiveHeaders() {
        var response = new HttpResponseSnapshot(200, 10L, "", Map.of(
                "set-cookie", List.of("session=abc"),
                "authorization", List.of("Basic dXNlcjpwYXNz"),
                "content-type", List.of("application/json")), 30);

        HttpResponseSnapshot masked = redactor.redact(response);

        assertThat(masked.headers().get("set-cookie")).containsExactly("••••");
        assertThat(masked.headers().get("authorization")).containsExactly("••••");
        assertThat(masked.headers().get("content-type")).containsExactly("application/json");
        assertThat(masked.certDaysLeft()).isEqualTo(30);
    }

    @Test
    void redactsConditionResultValueAndMessage() {
        var payload = new ResultPayload(List.of(new ResultColumn("CARD_NUMBER", ColumnType.TEXT, "VARCHAR")),
                List.of(List.of(TEST_PAN)), 1L, false);
        var condition = new ConditionParser().parse("[COL].CARD_NUMBER == \"x\"", Severity.DOWN);
        ConditionResult raw = new ConditionEngine(Clock.systemUTC()).evaluate(condition, new SqlEvaluationContext(payload));

        ConditionResult masked = redactor.redact(raw);

        assertThat(masked.passed()).isFalse();
        assertThat(masked.actual()).isEqualTo("•••• •••• •••• 1111");
        assertThat(masked.message()).doesNotContain(TEST_PAN).contains("1111");
    }

    @Test
    void nullBodyIsKept() {
        var response = new HttpResponseSnapshot(204, 1L, null, Map.of(), null);
        assertThat(redactor.redact(response).body()).isNull();
    }
}
