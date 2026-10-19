package io.orbit.history.applog;

import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.core.rolling.RollingFileAppender;
import ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.LoggerFactory;
import org.springframework.boot.logging.LogFile;
import org.springframework.boot.logging.LoggingInitializationContext;
import org.springframework.boot.logging.LoggingSystem;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** BE-53: the shipped logging properties configure daily + 50 MB rolling, gzip, 30 days, size cap, masked JSON. */
class AppLogRotationTest {

    @TempDir
    Path dataDir;

    private LoggingSystem system;

    @AfterEach
    void tearDown() {
        if (system != null) {
            system.cleanUp();
            ((LoggerContext) LoggerFactory.getILoggerFactory()).reset();
        }
    }

    @Test
    void shippedPropertiesProduceARollingMaskedJsonFileLog() throws Exception {
        Properties props = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/orbit-logging.properties")) {
            assertThat(in).as("orbit-logging.properties on the classpath").isNotNull();
            props.load(in);
        }
        props.setProperty("orbit.data-dir", dataDir.toString());
        StandardEnvironment env = new StandardEnvironment();
        env.getPropertySources().addFirst(new PropertiesPropertySource("orbit-logging", props));

        system = LoggingSystem.get(getClass().getClassLoader());
        system.beforeInitialize();
        system.initialize(new LoggingInitializationContext(env), null, LogFile.get(env));

        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        RollingFileAppender<?> file = (RollingFileAppender<?>) context.getLogger("ROOT").getAppender("FILE");
        assertThat(file).isNotNull();
        assertThat(Path.of(file.getFile())).isEqualTo(dataDir.resolve("logs").resolve("orbit.log"));
        SizeAndTimeBasedRollingPolicy<?> policy = (SizeAndTimeBasedRollingPolicy<?>) file.getRollingPolicy();
        assertThat(policy.getFileNamePattern()).endsWith("orbit-%d{yyyy-MM-dd}.%i.log.gz");
        assertThat(policy.getMaxHistory()).isEqualTo(30);

        LoggerFactory.getLogger("io.orbit.Test").warn("card {} declined", "4111111111111111");
        file.stop();

        String content = Files.readString(dataDir.resolve("logs").resolve("orbit.log"));
        assertThat(content).contains("\"message\":\"card").doesNotContain("4111111111111111");
    }
}
