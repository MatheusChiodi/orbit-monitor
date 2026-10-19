package io.orbit.history.applog;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.joran.JoranConfigurator;
import ch.qos.logback.classic.util.LogbackMDCAdapter;
import ch.qos.logback.core.rolling.RollingFileAppender;
import ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/** BE-53: the shipped appender fragment rolls daily + 50 MB, gzips, keeps 30 days and writes masked JSON. */
class AppLogRotationTest {

    private static final String CONFIG = """
            <configuration>
                <include resource="io/orbit/history/applog/file-appender.xml"/>
                <root level="INFO"><appender-ref ref="ORBIT_FILE"/></root>
            </configuration>
            """;

    @TempDir
    Path dataDir;

    private final LoggerContext context = new LoggerContext();

    @AfterEach
    void stop() {
        context.stop();
    }

    @Test
    void shippedFragmentProducesARollingMaskedJsonFileLog() throws Exception {
        context.setMDCAdapter(new LogbackMDCAdapter());
        context.putProperty("ORBIT_DATA_DIR", dataDir.toString().replace('\\', '/'));
        JoranConfigurator configurator = new JoranConfigurator();
        configurator.setContext(context);
        configurator.doConfigure(new ByteArrayInputStream(CONFIG.getBytes(StandardCharsets.UTF_8)));

        Logger root = context.getLogger(Logger.ROOT_LOGGER_NAME);
        RollingFileAppender<?> file = (RollingFileAppender<?>) root.getAppender("ORBIT_FILE");
        assertThat(file).as("ORBIT_FILE appender").isNotNull();
        assertThat(file.isStarted()).isTrue();
        assertThat(Path.of(file.getFile())).isEqualTo(dataDir.resolve("logs").resolve("orbit.log"));
        SizeAndTimeBasedRollingPolicy<?> policy = (SizeAndTimeBasedRollingPolicy<?>) file.getRollingPolicy();
        assertThat(policy.getFileNamePattern()).endsWith("/logs/orbit-%d{yyyy-MM-dd}.%i.log.gz");
        assertThat(policy.getMaxHistory()).isEqualTo(30);
        assertThat(policy.isCleanHistoryOnStart()).isTrue();

        context.getLogger("io.orbit.Test").warn("card {} declined", "4111111111111111");
        file.stop();

        String content = Files.readString(dataDir.resolve("logs").resolve("orbit.log"));
        assertThat(content).startsWith("{").contains("\"message\":\"card").doesNotContain("4111111111111111");
    }
}
