package io.orbit.alerting.channel;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * BE-28: notification channels (SMTP, Teams, Slack, Telegram, HMAC-signed webhook, WhatsApp
 * provider). Builds each channel's payload from one already-masked {@link Notification}; Jackson
 * does the escaping, so no value can break the JSON.
 */
public final class ChannelPayloads {

    /** What every channel receives; text and value are masked before this point. */
    public record Notification(String incidentId, String monitorName, String severity, String title, String text,
                               String link) {
    }

    private static final ObjectMapper JSON = new ObjectMapper();

    private ChannelPayloads() {
    }

    /** Slack incoming webhook: plain text plus a section block with a link. */
    public static String slack(Notification n) {
        String text = "*" + n.title() + "* (" + n.severity() + ")\n" + n.text() + "\n<" + n.link() + "|" + n.incidentId() + ">";
        return write(Map.of("text", n.title(), "blocks", List.of(Map.of("type", "section",
                "text", Map.of("type", "mrkdwn", "text", text)))));
    }

    /** Microsoft Teams incoming webhook (MessageCard). */
    public static String teams(Notification n) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("@type", "MessageCard");
        card.put("@context", "https://schema.org/extensions");
        card.put("themeColor", "DOWN".equals(n.severity()) ? "FF3B4F" : "F5A524");
        card.put("summary", n.title());
        card.put("title", n.title());
        card.put("text", n.text());
        card.put("potentialAction", List.of(Map.of("@type", "OpenUri", "name", "Open incident",
                "targets", List.of(Map.of("os", "default", "uri", n.link())))));
        return write(card);
    }

    /** Generic webhook body: the notification fields as JSON. */
    public static String webhook(Notification n) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("incidentId", n.incidentId());
        body.put("monitor", n.monitorName());
        body.put("severity", n.severity());
        body.put("title", n.title());
        body.put("text", n.text());
        body.put("link", n.link());
        return write(body);
    }

    /** Title, text and link as plain text (Telegram, WhatsApp). */
    public static String plainText(Notification n) {
        return n.title() + "\n" + n.text() + "\n" + n.link();
    }

    /** Telegram Bot API {@code sendMessage} body for one chat (the bot token goes in the URL, never here). */
    public static String telegram(Notification n, String chatId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("chat_id", chatId);
        body.put("text", plainText(n));
        body.put("disable_web_page_preview", true);
        return write(body);
    }

    /** WhatsApp Business Cloud API text message for one phone number (E.164). */
    public static String whatsapp(Notification n, String phone) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("recipient_type", "individual");
        body.put("to", phone);
        body.put("type", "text");
        body.put("text", Map.of("preview_url", false, "body", plainText(n)));
        return write(body);
    }

    /**
     * WhatsApp Cloud API template message (needed outside the 24-hour customer service window): the
     * approved template receives the title and the text with the link as its two body parameters.
     */
    public static String whatsappTemplate(Notification n, String phone, String template, String languageTag) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("recipient_type", "individual");
        body.put("to", phone);
        body.put("type", "template");
        body.put("template", Map.of("name", template, "language", Map.of("code", languageTag.replace('-', '_')),
                "components", List.of(Map.of("type", "body", "parameters", List.of(
                        Map.of("type", "text", "text", n.title()),
                        Map.of("type", "text", "text", n.text() + " " + n.link()))))));
        return write(body);
    }

    /** E-mail to deliver: recipients, subject (the title) and a plain-text body with the link. */
    public static String email(Notification n, List<String> to) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("to", to);
        body.put("subject", n.title());
        body.put("body", n.text() + "\n\n" + n.link());
        return write(body);
    }

    /** {@code X-Orbit-Signature: sha256=<hex HMAC of "timestamp.body">} and a timestamp header against replay. */
    public static Map<String, String> signatureHeaders(String body, String secret, long epochSeconds) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signature = mac.doFinal((epochSeconds + "." + body).getBytes(StandardCharsets.UTF_8));
            Map<String, String> headers = new LinkedHashMap<>();
            headers.put("X-Orbit-Timestamp", Long.toString(epochSeconds));
            headers.put("X-Orbit-Signature", "sha256=" + HexFormat.of().formatHex(signature));
            return headers;
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }

    private static String write(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not build the channel payload", e);
        }
    }
}
