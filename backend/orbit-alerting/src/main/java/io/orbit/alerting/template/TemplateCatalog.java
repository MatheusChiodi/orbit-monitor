package io.orbit.alerting.template;

import io.orbit.common.privacy.SensitiveDataRedactor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

/**
 * BE-35: built-in notification templates in English and Brazilian Portuguese, overridden per id and
 * language by orbit.notification-templates.json. Rendering goes through {@link NotificationTemplates},
 * so every value is redacted.
 */
public class TemplateCatalog {

    /** Rendered title (subject) and text (body). */
    public record Rendered(String title, String text) {
    }

    public static final List<String> IDS = List.of("incident.down", "incident.warn", "incident.reopened",
            "incident.severity", "incident.resolved", "incident.flapping", "incident.escalation", "incident.oncall",
            "channel.test");
    /** Variables the dispatcher fills in. */
    public static final List<String> VARIABLES = List.of("monitor", "group", "severity", "detail", "link",
            "incidentId", "openedAt", "duration", "ticket", "step", "onCall");
    private static final Set<String> LANGUAGES = Set.of("en", "pt-BR");
    private static final Map<String, NotificationTemplate> DEFAULTS = defaultTemplates();

    private final Supplier<List<NotificationTemplate>> overrides;
    private final SensitiveDataRedactor redactor = new SensitiveDataRedactor();

    public TemplateCatalog(Supplier<List<NotificationTemplate>> overrides) {
        this.overrides = overrides;
    }

    public static Map<String, NotificationTemplate> defaults() {
        return DEFAULTS;
    }

    /** Validation of stored overrides (empty when valid). */
    public static List<String> problems(List<NotificationTemplate> templates) {
        List<String> problems = new ArrayList<>();
        for (NotificationTemplate t : templates) {
            if (!IDS.contains(t.id())) {
                problems.add(t.id() + ": unknown template (known: " + String.join(", ", IDS) + ")");
            } else if (!LANGUAGES.containsAll(t.title().keySet()) || !LANGUAGES.containsAll(t.text().keySet())) {
                problems.add(t.id() + ": languages must be en or pt-BR");
            }
        }
        return problems;
    }

    public boolean isCustom(String id) {
        return override(id).isPresent();
    }

    /** Every template as used: defaults with the stored overrides applied. */
    public List<NotificationTemplate> effective() {
        return IDS.stream().map(this::effective).toList();
    }

    public NotificationTemplate effective(String id) {
        NotificationTemplate base = DEFAULTS.get(id);
        if (base == null) {
            throw new IllegalArgumentException("Unknown notification template: " + id);
        }
        Optional<NotificationTemplate> custom = override(id);
        if (custom.isEmpty()) {
            return base;
        }
        Map<String, String> title = new HashMap<>(base.title());
        Map<String, String> text = new HashMap<>(base.text());
        title.putAll(nonBlank(custom.get().title()));
        text.putAll(nonBlank(custom.get().text()));
        return new NotificationTemplate(id, title, text);
    }

    public Rendered render(String id, Locale locale, Map<String, Object> variables) {
        NotificationTemplate template = effective(id);
        Map<String, String> flat = new HashMap<>();
        template.title().forEach((lang, value) -> flat.put("title." + lang, value));
        template.text().forEach((lang, value) -> flat.put("text." + lang, value));
        NotificationTemplates rendering = new NotificationTemplates(flat, redactor);
        return new Rendered(rendering.render("title", locale, variables), rendering.render("text", locale, variables));
    }

    private Optional<NotificationTemplate> override(String id) {
        return overrides.get().stream().filter(t -> t.id().equals(id)).findFirst();
    }

    private static Map<String, String> nonBlank(Map<String, String> values) {
        Map<String, String> kept = new HashMap<>();
        values.forEach((k, v) -> {
            if (v != null && !v.isBlank()) {
                kept.put(k, v);
            }
        });
        return kept;
    }

    private static Map<String, NotificationTemplate> defaultTemplates() {
        Map<String, NotificationTemplate> d = new LinkedHashMap<>();
        put(d, "incident.down", "{{monitor}} is down", "{{monitor}} está fora do ar",
                "{{detail}}", "{{detail}}");
        put(d, "incident.warn", "{{monitor}} needs attention", "{{monitor}} requer atenção",
                "{{detail}}", "{{detail}}");
        put(d, "incident.reopened", "{{monitor}} failed again ({{severity}})", "{{monitor}} falhou de novo ({{severity}})",
                "{{detail}}", "{{detail}}");
        put(d, "incident.severity", "{{monitor}} is now {{severity}}", "{{monitor}} agora está {{severity}}",
                "{{detail}}", "{{detail}}");
        put(d, "incident.resolved", "{{monitor}} resolved", "{{monitor}} resolvido",
                "Back to normal after {{duration}}.", "Normalizado após {{duration}}.");
        put(d, "incident.flapping", "{{monitor}} is flapping", "{{monitor}} está oscilando",
                "It keeps changing state; one incident stays open until it settles.",
                "O estado continua mudando; um único incidente fica aberto até estabilizar.");
        put(d, "incident.escalation", "Escalation: {{monitor}} is {{severity}} (not acknowledged)",
                "Escalonamento: {{monitor}} está {{severity}} (sem reconhecimento)",
                "{{step}}: {{detail}}", "{{step}}: {{detail}}");
        put(d, "incident.oncall", "On call", "Plantão", "On call: {{onCall}}", "Plantão: {{onCall}}");
        put(d, "channel.test", "Orbit test notification", "Notificação de teste do Orbit",
                "If you can read this, the channel works.", "Se você está lendo isto, o canal funciona.");
        return Map.copyOf(d);
    }

    private static void put(Map<String, NotificationTemplate> d, String id, String titleEn, String titlePt,
                            String textEn, String textPt) {
        d.put(id, new NotificationTemplate(id, Map.of("en", titleEn, "pt-BR", titlePt),
                Map.of("en", textEn, "pt-BR", textPt)));
    }
}
