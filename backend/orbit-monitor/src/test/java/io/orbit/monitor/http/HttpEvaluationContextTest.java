package io.orbit.monitor.http;

import io.orbit.monitor.condition.Placeholder;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class HttpEvaluationContextTest {

    private static final String BODY = """
            {"status":"UP","queue":{"size":42},"items":[{"value":1.5},{"value":2}]}
            """;

    private final HttpResponseSnapshot response = new HttpResponseSnapshot(
            200, 312L, BODY, Map.of("Content-Type", List.of("application/json")), 45);

    private final HttpEvaluationContext ctx = new HttpEvaluationContext(response);

    @Test
    void statusTimeAndCertificate() {
        assertThat(ctx.resolve(Placeholder.STATUS, null)).contains(200);
        assertThat(ctx.resolve(Placeholder.RESPONSE_TIME, null)).contains(312L);
        assertThat(ctx.resolve(Placeholder.CERT_DAYS_LEFT, null)).contains(45);
    }

    @Test
    void bodyWithoutPathIsWholeText() {
        assertThat(ctx.resolve(Placeholder.BODY, null)).contains(BODY);
    }

    @Test
    void bodyWithPathUsesJsonPath() {
        assertThat(ctx.resolve(Placeholder.BODY, "status")).contains("UP");
        assertThat(ctx.resolve(Placeholder.BODY, "queue.size")).contains(42);
        assertThat(ctx.resolve(Placeholder.BODY, "$.items[0].value")).contains(1.5);
    }

    @Test
    void missingPathOrNonJsonBodyHasNoValue() {
        assertThat(ctx.resolve(Placeholder.BODY, "does.not.exist")).isEmpty();
        var plain = new HttpEvaluationContext(new HttpResponseSnapshot(200, 1L, "pong", Map.of(), null));
        assertThat(plain.resolve(Placeholder.BODY, "status")).isEmpty();
        assertThat(plain.resolve(Placeholder.CERT_DAYS_LEFT, null)).isEmpty();
    }

    @Test
    void headerIsCaseInsensitive() {
        assertThat(ctx.resolve(Placeholder.HEADER, "content-type")).contains("application/json");
        assertThat(ctx.resolve(Placeholder.HEADER, "x-missing")).isEmpty();
    }

    @Test
    void sqlPlaceholdersDoNotExistInHttp() {
        assertThat(ctx.resolve(Placeholder.ROWS, null)).isEmpty();
    }
}
