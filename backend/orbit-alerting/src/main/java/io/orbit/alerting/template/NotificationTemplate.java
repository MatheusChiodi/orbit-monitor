package io.orbit.alerting.template;

import io.orbit.config.ConfigItem;

import java.util.Map;

/**
 * BE-35: one template of orbit.notification-templates.json: title and text per language tag
 * ({@code en}, {@code pt-BR}) with {@code {{variable}}} placeholders. Only the languages present
 * override the built-in default.
 */
public record NotificationTemplate(String id, Map<String, String> title, Map<String, String> text)
        implements ConfigItem {

    public NotificationTemplate {
        title = title == null ? Map.of() : Map.copyOf(title);
        text = text == null ? Map.of() : Map.copyOf(text);
    }
}
