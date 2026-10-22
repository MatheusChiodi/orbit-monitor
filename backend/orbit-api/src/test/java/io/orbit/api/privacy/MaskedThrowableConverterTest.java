package io.orbit.api.privacy;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CORE-16 stack traces in logs are masked")
class MaskedThrowableConverterTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    private static String convert(Throwable error) {
        LoggerContext context = new LoggerContext();
        LoggingEvent event = new LoggingEvent("test", context.getLogger("test"), Level.ERROR, "failed", error, null);
        MaskedThrowableConverter converter = new MaskedThrowableConverter();
        converter.setContext(context);
        converter.start();
        return converter.convert(event);
    }

    @Test
    @DisplayName("exception and cause messages never carry a card number, CPF or token")
    void masksMessages() {
        Exception error = new IllegalStateException("Data truncation: value '" + TEST_PAN + "' too long",
                new RuntimeException("cpf 529.982.247-25 password=hunter2"));

        String trace = convert(error);

        assertThat(trace).contains("IllegalStateException", "•••• •••• •••• 1111", "•••.•••.•••-25", "password=••••",
                "MaskedThrowableConverterTest").doesNotContain(TEST_PAN, "529.982.247", "hunter2");
    }

    @Test
    @DisplayName("a line without an exception stays empty")
    void noThrowable() {
        assertThat(convert(null)).isEmpty();
    }
}
