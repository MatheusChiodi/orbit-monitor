package io.orbit.history.applog;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MaskedJsonFormatterTest {

    private final MaskedJsonFormatter formatter = new MaskedJsonFormatter();
    private final LoggerContext context = new LoggerContext();

    private LoggingEvent event(Map<String, String> mdc, String message, Throwable error, Object... args) {
        LoggingEvent event = new LoggingEvent("io.orbit.Test", context.getLogger("io.orbit.probe.HttpProbe"),
                Level.WARN, message, error, args);
        event.setThreadName("probe-1");
        event.setMDCPropertyMap(mdc);
        return event;
    }

    @Test
    void writesOneJsonObjectPerLineWithTheStandardFields() throws Exception {
        String line = formatter.format(event(Map.of(), "check {} slow", null, "api"));

        assertThat(line).endsWith("\n").doesNotContain("\n\n");
        JsonNode json = new ObjectMapper().readTree(line);
        assertThat(json.get("@timestamp").asText()).matches("\\d{4}-\\d{2}-\\d{2}T.*Z");
        assertThat(json.get("level").asText()).isEqualTo("WARN");
        assertThat(json.get("logger").asText()).isEqualTo("io.orbit.probe.HttpProbe");
        assertThat(json.get("thread").asText()).isEqualTo("probe-1");
        assertThat(json.get("message").asText()).isEqualTo("check api slow");
    }

    @Test
    void masksCardNumbersAndSecretsInMessagesArgumentsAndExceptions() throws Exception {
        LoggingEvent e = event(Map.of("customerEmail", "maria.silva@example.com"),
                "charge failed for {} token=abc123def", new IllegalStateException("password=hunter2 rejected"),
                "4111 1111 1111 1111");

        String line = formatter.format(e);

        assertThat(line).doesNotContain("4111 1111 1111 1111", "abc123def", "hunter2", "maria.silva@example.com");
        JsonNode json = new ObjectMapper().readTree(line);
        assertThat(json.get("exception").asText()).contains("IllegalStateException");
        assertThat(json.get("mdc").get("customerEmail").asText()).isNotBlank();
    }
}
