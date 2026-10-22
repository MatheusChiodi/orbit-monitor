package io.orbit.alerting.channel;

import io.orbit.config.ConfigItem;
import io.orbit.security.vault.SecretRef;

import java.util.List;

/**
 * A notification channel in orbit.channels.json. Anything that grants access is a vault reference:
 * webhook URLs (they carry tokens), the HMAC signing secret, the Telegram bot token, the WhatsApp
 * provider token and the SMTP password ({@code token}).
 *
 * @param url         SLACK/TEAMS/WEBHOOK: the webhook; WHATSAPP: the provider messages endpoint;
 *                    TELEGRAM: optional Bot API base (default https://api.telegram.org)
 * @param groupIds    groups whose incidents reach this channel; empty means every group
 * @param minSeverity WARN or DOWN
 * @param token       TELEGRAM bot token, WHATSAPP bearer token or EMAIL SMTP password
 * @param recipients  EMAIL addresses, TELEGRAM chat ids or WHATSAPP phone numbers (E.164)
 * @param smtp        EMAIL server settings
 * @param locale      language of the messages (en or pt-BR; BE-35)
 * @param providerTemplate WHATSAPP: approved message template (body parameters: title, text) for
 *                    business-initiated messages; plain text when empty
 */
public record ChannelDef(String id, String name, Type type, SecretRef url, SecretRef signingSecret,
                         List<String> groupIds, String minSeverity, boolean enabled, SecretRef token,
                         List<String> recipients, Smtp smtp, String locale, String providerTemplate)
        implements ConfigItem {

    public enum Type { SLACK, TEAMS, WEBHOOK, EMAIL, TELEGRAM, WHATSAPP }

    /**
     * @param security NONE, STARTTLS (default) or TLS (implicit, usually port 465)
     */
    public record Smtp(String host, Integer port, String username, String from, String security) {

        public int portOrDefault() {
            if (port != null) {
                return port;
            }
            return "TLS".equals(security) ? 465 : 587;
        }

        public String securityOrDefault() {
            return security == null || security.isBlank() ? "STARTTLS" : security;
        }
    }

    public ChannelDef {
        groupIds = groupIds == null ? List.of() : List.copyOf(groupIds);
        minSeverity = minSeverity == null ? "DOWN" : minSeverity;
        recipients = recipients == null ? List.of() : List.copyOf(recipients);
        locale = locale == null || locale.isBlank() ? "en" : locale;
        providerTemplate = providerTemplate == null || providerTemplate.isBlank() ? null : providerTemplate;
    }

    /** Any channel type without a WhatsApp provider template. */
    public ChannelDef(String id, String name, Type type, SecretRef url, SecretRef signingSecret, List<String> groupIds,
                      String minSeverity, boolean enabled, SecretRef token, List<String> recipients, Smtp smtp,
                      String locale) {
        this(id, name, type, url, signingSecret, groupIds, minSeverity, enabled, token, recipients, smtp, locale, null);
    }

    /** Webhook-style channel (Slack, Teams, signed webhook). */
    public ChannelDef(String id, String name, Type type, SecretRef url, SecretRef signingSecret, List<String> groupIds,
                      String minSeverity, boolean enabled) {
        this(id, name, type, url, signingSecret, groupIds, minSeverity, enabled, null, List.of(), null, null, null);
    }

    @Override
    public String toString() {
        return "ChannelDef[" + id + ", " + name + ", " + type + ", url=•••• (vault)]";
    }
}
