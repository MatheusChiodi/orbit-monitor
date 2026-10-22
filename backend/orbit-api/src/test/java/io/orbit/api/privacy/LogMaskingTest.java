package io.orbit.api.privacy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("CORE-16 every log line of the running app is masked")
class LogMaskingTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    @Test
    @DisplayName("a card number logged anywhere never reaches the console")
    void consoleIsMasked(CapturedOutput output) {
        LoggerFactory.getLogger("any.logger").info("charge {} declined for token=abc123", TEST_PAN);

        assertThat(output.getOut()).contains("charge •••• •••• •••• 1111 declined", "token=••••")
                .doesNotContain(TEST_PAN, "abc123");
    }

    @Test
    @DisplayName("a card number inside an exception message never reaches the console")
    void stackTracesAreMasked(CapturedOutput output) {
        LoggerFactory.getLogger("any.logger").error("query failed",
                new IllegalStateException("Data truncation: value '" + TEST_PAN + "'"));

        assertThat(output.getOut()).contains("IllegalStateException", "•••• •••• •••• 1111")
                .doesNotContain(TEST_PAN);
    }
}
