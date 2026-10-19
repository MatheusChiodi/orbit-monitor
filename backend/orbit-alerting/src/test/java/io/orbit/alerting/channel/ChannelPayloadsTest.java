package io.orbit.alerting.channel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-28 channels")
class ChannelPayloadsTest {

    private final ObjectMapper json = new ObjectMapper();
    private final ChannelPayloads.Notification n = new ChannelPayloads.Notification("inc_1", "Reconciliation queue",
            "DOWN", "Reconciliation queue is down", "PENDING_QTY = 347 · rule PENDING_QTY < 200",
            "http://orbit.local:8080/incidents/inc_1");

    @Test
    @DisplayName("Slack and Teams payloads are valid JSON carrying the rule and the link")
    void chatPayloads() throws Exception {
        JsonNode slack = json.readTree(ChannelPayloads.slack(n));
        JsonNode teams = json.readTree(ChannelPayloads.teams(n));
        assertThat(slack.toString()).contains("PENDING_QTY = 347", "inc_1");
        assertThat(teams.toString()).contains("Reconciliation queue is down", "http://orbit.local:8080/incidents/inc_1");
    }

    @Test
    @DisplayName("webhooks are signed with HMAC-SHA256 over timestamp and body")
    void signedWebhook() throws Exception {
        String body = ChannelPayloads.webhook(n);
        Map<String, String> headers = ChannelPayloads.signatureHeaders(body, "whsec_test", 1_760_000_000L);

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("whsec_test".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String expected = HexFormat.of().formatHex(mac.doFinal(("1760000000." + body).getBytes(StandardCharsets.UTF_8)));

        assertThat(headers).containsEntry("X-Orbit-Timestamp", "1760000000")
                .containsEntry("X-Orbit-Signature", "sha256=" + expected);
        assertThat(json.readTree(body).path("incidentId").asText()).isEqualTo("inc_1");
    }

    @Test
    @DisplayName("text is escaped so a value cannot break the JSON")
    void escaping() throws Exception {
        var tricky = new ChannelPayloads.Notification("inc_2", "Q\"uote", "WARN", "t", "line1\nline2 \"x\"", "l");
        assertThat(json.readTree(ChannelPayloads.slack(tricky)).toString()).contains("line1\\nline2");
    }
}
