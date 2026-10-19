package io.orbit.alerting.template;

import io.orbit.common.privacy.SensitiveDataRedactor;

import java.util.Locale;
import java.util.Map;

/**
 * BE-35: message templates with {@code {{variable}}} placeholders, per language (en/pt-BR), stored in
 * orbit.notification-templates.json. Every variable value is redacted before it is inserted.
 */
public class NotificationTemplates {

    /** @param templates key {@code <name>.<language tag>}, e.g. {@code incident.opened.pt-BR} */
    public NotificationTemplates(Map<String, String> templates, SensitiveDataRedactor redactor) {
    }

    /** Uses the requested language, falling back to English; unknown variables are left empty. */
    public String render(String name, Locale locale, Map<String, Object> variables) {
        throw new UnsupportedOperationException("BE-35 notification templates are not implemented yet");
    }
}
