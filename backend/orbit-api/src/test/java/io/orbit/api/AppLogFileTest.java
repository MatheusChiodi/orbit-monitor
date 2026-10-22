package io.orbit.api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "orbit.data-dir=${java.io.tmpdir}/orbit-test/applog-file-test/data")
@DisplayName("BE-53: the running app writes masked JSON lines to <data-dir>/logs/orbit.log")
class AppLogFileTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    @Value("${orbit.data-dir}")
    Path dataDir;

    @Test
    void writesMaskedJsonLog() throws Exception {
        LoggerFactory.getLogger("orbit.applog.test").info("payment card {} failed", TEST_PAN);

        Path log = dataDir.resolve("logs/orbit.log");
        assertThat(log).exists();
        String content = Files.readString(log);
        assertThat(content).contains("\"logger\":\"orbit.applog.test\"").contains("1111")
                .doesNotContain(TEST_PAN);
    }
}
