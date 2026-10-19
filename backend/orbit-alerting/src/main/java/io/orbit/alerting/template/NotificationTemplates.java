package io.orbit.alerting.template;

import io.orbit.common.privacy.SensitiveDataRedactor;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * BE-35: message templates with {@code {{variable}}} placeholders, per language (en/pt-BR), stored in
 * orbit.notification-templates.json. Every variable value is redacted before it is inserted.
 */
public class NotificationTemplates {

    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*([A-Za-z0-9_.-]+)\\s*}}");

    private final Map<String, String> templates;
    private final SensitiveDataRedactor redactor;

    /** @param templates key {@code <name>.<language tag>}, e.g. {@code incident.opened.pt-BR} */
    public NotificationTemplates(Map<String, String> templates, SensitiveDataRedactor redactor) {
        this.templates = Map.copyOf(templates);
        this.redactor = redactor;
    }

    /** Uses the requested language, falling back to English; unknown variables are left empty. */
    public String render(String name, Locale locale, Map<String, Object> variables) {
        String template = templates.get(name + "." + locale.toLanguageTag());
        if (template == null) {
            template = templates.get(name + ".en");
        }
        if (template == null) {
            throw new IllegalArgumentException("Unknown notification template: " + name);
        }
        Matcher m = VARIABLE.matcher(template);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            String key = m.group(1);
            Object value = variables.get(key);
            String text = value == null ? "" : String.valueOf(redactor.redact(key, value));
            m.appendReplacement(out, Matcher.quoteReplacement(redactor.redactText(text)));
        }
        m.appendTail(out);
        return out.toString();
    }
}
