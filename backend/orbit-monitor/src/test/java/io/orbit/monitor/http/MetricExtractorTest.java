package io.orbit.monitor.http;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-23 body metric extraction")
class MetricExtractorTest {

    private static final String BODY = """
            {"queue":{"size":42,"oldest":"17"},"status":"UP","items":[{"value":1.5},{"value":2.5}]}
            """;

    @Test
    @DisplayName("extracts numbers and numeric strings by JSONPath")
    void extracts() {
        assertThat(MetricExtractor.extract(BODY, List.of("$.queue.size", "$.queue.oldest", "$.items[1].value")))
                .containsEntry("$.queue.size", 42.0)
                .containsEntry("$.queue.oldest", 17.0)
                .containsEntry("$.items[1].value", 2.5);
    }

    @Test
    @DisplayName("text, missing paths and non-JSON bodies are skipped")
    void skips() {
        assertThat(MetricExtractor.extract(BODY, List.of("$.status", "$.missing"))).isEmpty();
        assertThat(MetricExtractor.extract("pong", List.of("$.a"))).isEmpty();
    }

    @Test
    @DisplayName("a path matching several values is not a single metric")
    void multipleValues() {
        assertThat(MetricExtractor.extract(BODY, List.of("$.items[*].value"))).isEmpty();
    }
}
