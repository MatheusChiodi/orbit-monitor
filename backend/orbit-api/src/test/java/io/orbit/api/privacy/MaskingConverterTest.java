package io.orbit.api.privacy;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("CORE-16 log masking converter")
class MaskingConverterTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111 1111 1111 1111";

    private static String convert(String message, Object... args) {
        LoggerContext context = new LoggerContext();
        LoggingEvent event = new LoggingEvent("test", context.getLogger("test"), Level.INFO, message, null, args);
        MaskingConverter converter = new MaskingConverter();
        converter.start();
        return converter.convert(event);
    }

    @Test
    @DisplayName("masks card numbers, CPF and tokens, including formatted arguments")
    void masks() {
        String line = convert("payment {} for {} with Bearer abc.def", TEST_PAN, "529.982.247-25");
        assertThat(line).doesNotContain(TEST_PAN, "529.982.247", "abc.def")
                .contains("•••• •••• •••• 1111", "•••.•••.•••-25", "Bearer ••••");
    }

    @Test
    @DisplayName("harmless lines are unchanged")
    void unchanged() {
        assertThat(convert("Check {} took {} ms", "sel_queue", 87)).isEqualTo("Check sel_queue took 87 ms");
    }
}
