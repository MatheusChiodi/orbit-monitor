package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CORE-15 message bundles: every English key has a Brazilian Portuguese translation")
class MessageBundlesTest {

    private static Properties load(String name) throws IOException {
        Properties p = new Properties();
        try (InputStream in = MessageBundlesTest.class.getResourceAsStream("/" + name)) {
            assertThat(in).as(name).isNotNull();
            p.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return p;
    }

    @Test
    void bothLanguagesHaveTheSameKeys() throws IOException {
        Properties en = load("messages.properties");
        Properties pt = load("messages_pt_BR.properties");

        assertThat(en.stringPropertyNames()).isNotEmpty();
        assertThat(pt.stringPropertyNames()).containsExactlyInAnyOrderElementsOf(en.stringPropertyNames());
        pt.stringPropertyNames().forEach(k -> assertThat(pt.getProperty(k)).as(k).isNotBlank());
    }

    @Test
    void everyProblemCodeHasATitle() throws IOException {
        Properties en = load("messages.properties");
        for (String code : new String[]{"invalid-config", "unsafe-sql", "invalid-condition", "ssrf-blocked",
                "secret-error", "target-error", "not-found", "conflict", "bad-request",
                "access-denied"}) {
            assertThat(en.getProperty("problem." + code + ".title")).as(code).isNotBlank();
        }
    }
}
