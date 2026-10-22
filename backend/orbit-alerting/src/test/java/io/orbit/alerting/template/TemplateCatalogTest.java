package io.orbit.alerting.template;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-35 notification templates: built-in en/pt-BR defaults, overrides from orbit.notification-templates.json")
class TemplateCatalogTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";
    private static final Locale PT = Locale.forLanguageTag("pt-BR");

    private final List<NotificationTemplate> overrides = new ArrayList<>();
    private final TemplateCatalog catalog = new TemplateCatalog(() -> overrides);

    @Test
    @DisplayName("every built-in template exists in English and Brazilian Portuguese")
    void defaults() {
        assertThat(TemplateCatalog.IDS).contains("incident.down", "incident.warn", "incident.reopened",
                "incident.severity", "incident.resolved", "incident.flapping", "incident.escalation", "incident.oncall");
        for (String id : TemplateCatalog.IDS) {
            NotificationTemplate template = TemplateCatalog.defaults().get(id);
            assertThat(template.title()).as(id).containsKeys("en", "pt-BR");
            assertThat(template.text()).as(id).containsKeys("en", "pt-BR");
        }
        Map<String, Object> vars = Map.of("monitor", "Queue", "detail", "QTY 347 > 200");
        assertThat(catalog.render("incident.down", Locale.ENGLISH, vars).title()).isEqualTo("Queue is down");
        assertThat(catalog.render("incident.down", PT, vars).title()).isEqualTo("Queue está fora do ar");
        assertThat(catalog.render("incident.down", PT, vars).text()).contains("QTY 347 > 200");
    }

    @Test
    @DisplayName("an override wins for its languages; the others keep the default")
    void overrides() {
        overrides.add(new NotificationTemplate("incident.down", Map.of("en", "[P1] {{monitor}} DOWN"), Map.of()));
        Map<String, Object> vars = Map.of("monitor", "Queue");
        assertThat(catalog.render("incident.down", Locale.ENGLISH, vars).title()).isEqualTo("[P1] Queue DOWN");
        assertThat(catalog.render("incident.down", PT, vars).title()).isEqualTo("Queue está fora do ar");
        assertThat(catalog.effective()).filteredOn(t -> t.id().equals("incident.down")).singleElement()
                .satisfies(t -> assertThat(t.title()).containsEntry("en", "[P1] {{monitor}} DOWN"));
        assertThat(catalog.isCustom("incident.down")).isTrue();
        assertThat(catalog.isCustom("incident.warn")).isFalse();
    }

    @Test
    @DisplayName("values are redacted and unknown ids are refused")
    void redactedAndValidated() {
        assertThat(catalog.render("incident.down", Locale.ENGLISH, Map.of("monitor", "Cards", "detail", "PAN " + TEST_PAN))
                .text()).doesNotContain(TEST_PAN);
        assertThat(TemplateCatalog.problems(List.of(new NotificationTemplate("nope", Map.of("en", "x"), Map.of()))))
                .containsExactly("nope: unknown template (known: " + String.join(", ", TemplateCatalog.IDS) + ")");
        assertThat(TemplateCatalog.problems(List.of(new NotificationTemplate("incident.down", Map.of("fr", "x"),
                Map.of())))).containsExactly("incident.down: languages must be en or pt-BR");
        assertThatThrownBy(() -> catalog.render("nope", Locale.ENGLISH, Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
