package io.orbit.alerting.channel;

import java.util.Map;

/**
 * BE-28: notification channels (SMTP, Teams, Slack, Telegram, HMAC-signed webhook, WhatsApp
 * provider). Builds each channel's payload from one already-masked {@link Notification}.
 */
public final class ChannelPayloads {

    /** What every channel receives; text and value are masked before this point. */
    public record Notification(String incidentId, String monitorName, String severity, String title, String text,
                               String link) {
    }

    private ChannelPayloads() {
    }

    public static String slack(Notification n) {
        throw new UnsupportedOperationException("BE-28 channels are not implemented yet");
    }

    public static String teams(Notification n) {
        throw new UnsupportedOperationException("BE-28 channels are not implemented yet");
    }

    public static String webhook(Notification n) {
        throw new UnsupportedOperationException("BE-28 channels are not implemented yet");
    }

    /** {@code X-Orbit-Signature: sha256=<hex HMAC of the body>} and a timestamp header against replay. */
    public static Map<String, String> signatureHeaders(String body, String secret, long epochSeconds) {
        throw new UnsupportedOperationException("BE-28 channels are not implemented yet");
    }
}
