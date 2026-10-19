package io.orbit.alerting.template;

import io.orbit.common.privacy.SensitiveDataRedactor;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-35 notification templates")
class NotificationTemplatesTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";

    private final NotificationTemplates templates = new NotificationTemplates(Map.of(
            "incident.opened.en", "{{monitor}} is down: {{value}} (rule {{rule}})",
            "incident.opened.pt-BR", "{{monitor}} está fora: {{value}} (regra {{rule}})"), new SensitiveDataRedactor());

    @Test
    @DisplayName("renders in English and Brazilian Portuguese")
    void languages() {
        Map<String, Object> vars = Map.of("monitor", "Queue", "value", 347, "rule", "QTY < 200");
        assertThat(templates.render("incident.opened", Locale.ENGLISH, vars)).isEqualTo("Queue is down: 347 (rule QTY < 200)");
        assertThat(templates.render("incident.opened", Locale.forLanguageTag("pt-BR"), vars))
                .isEqualTo("Queue está fora: 347 (regra QTY < 200)");
        assertThat(templates.render("incident.opened", Locale.FRENCH, vars)).startsWith("Queue is down");
    }

    @Test
    @DisplayName("values are redacted: a card number never reaches a channel")
    void redacted() {
        String text = templates.render("incident.opened", Locale.ENGLISH, Map.of("monitor", "Cards", "value", TEST_PAN,
                "rule", "x"));
        assertThat(text).doesNotContain(TEST_PAN).contains("1111");
    }

    @Test
    @DisplayName("unknown variables render empty")
    void unknownVariables() {
        assertThat(templates.render("incident.opened", Locale.ENGLISH, Map.of("monitor", "Q")))
                .isEqualTo("Q is down:  (rule )");
    }
}
