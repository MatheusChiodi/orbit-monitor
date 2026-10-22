package io.orbit.alerting.channel;

import io.orbit.security.vault.MasterKey;
import io.orbit.security.vault.SecretCipher;
import io.orbit.security.vault.SecretResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.URI;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-28 e-mail, Telegram and WhatsApp-provider delivery")
class ChannelDeliveryTest {

    private static final String BOT_TOKEN = "123456:bot-secret-token";

    record Post(URI uri, Map<String, String> headers, String body) {
    }

    @TempDir
    Path dir;
    private final List<Post> posts = new ArrayList<>();
    private final List<EmailSender.EmailMessage> mails = new ArrayList<>();
    private SecretResolver secrets;
    private ChannelDelivery delivery;
    private final ChannelPayloads.Notification notification = new ChannelPayloads.Notification("inc_1", "Queue", "DOWN",
            "Queue is down", "QTY 347 > 200", "http://orbit.local/incidents/inc_1");

    @BeforeEach
    void setUp() {
        secrets = new SecretResolver(new SecretCipher(MasterKey.loadOrCreate(dir.resolve("master.key"))), n -> null);
        delivery = new ChannelDelivery((uri, headers, body) -> posts.add(new Post(uri, headers, body)), mails::add,
                secrets, Clock.fixed(Instant.parse("2026-10-18T12:00:00Z"), ZoneOffset.UTC));
    }

    private ChannelDef channel(ChannelDef.Type type, String url, String token, List<String> recipients,
                               ChannelDef.Smtp smtp) {
        return new ChannelDef("chn", "C", type, url == null ? null : secrets.seal(url), null, List.of(), "WARN", true,
                token == null ? null : secrets.seal(token), recipients, smtp, "en");
    }

    @Test
    @DisplayName("Telegram: one sendMessage per chat, token only in the request URL")
    void telegram() throws Exception {
        ChannelDef c = channel(ChannelDef.Type.TELEGRAM, null, BOT_TOKEN, List.of("-100200", "42"), null);
        List<String> payloads = delivery.payloads(c, notification);
        assertThat(payloads).hasSize(2).allSatisfy(p -> assertThat(p).doesNotContain(BOT_TOKEN).contains("Queue is down"));
        assertThat(payloads.getFirst()).contains("\"chat_id\":\"-100200\"");

        delivery.deliver(c, payloads.getFirst());
        assertThat(posts.getFirst().uri()).hasToString("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage");
        assertThat(posts.getFirst().headers()).containsEntry("Content-Type", "application/json");
    }

    @Test
    @DisplayName("Telegram: a failure message never carries the token")
    void telegramErrorMasksToken() {
        ChannelDelivery failing = new ChannelDelivery((uri, headers, body) -> {
            throw new IllegalStateException("POST " + uri + " failed");
        }, mails::add, secrets, Clock.systemUTC());
        ChannelDef c = channel(ChannelDef.Type.TELEGRAM, "https://telegram.local", BOT_TOKEN, List.of("42"), null);
        assertThatThrownBy(() -> failing.deliver(c, failing.payloads(c, notification).getFirst()))
                .hasMessageNotContaining(BOT_TOKEN).hasMessageContaining("telegram.local");
    }

    @Test
    @DisplayName("WhatsApp provider (Cloud API): bearer token header and one text message per phone")
    void whatsapp() throws Exception {
        ChannelDef c = channel(ChannelDef.Type.WHATSAPP, "https://graph.example.com/v21.0/1234/messages", "wa-token",
                List.of("+5511999990000"), null);
        String payload = delivery.payloads(c, notification).getFirst();
        assertThat(payload).contains("\"messaging_product\":\"whatsapp\"", "\"to\":\"+5511999990000\"", "Queue is down")
                .doesNotContain("wa-token");

        delivery.deliver(c, payload);
        assertThat(posts.getFirst().uri()).hasToString("https://graph.example.com/v21.0/1234/messages");
        assertThat(posts.getFirst().headers()).containsEntry("Authorization", "Bearer wa-token");
    }

    @Test
    @DisplayName("E-mail: subject is the title, body has text and link, password from the vault")
    void email() throws Exception {
        ChannelDef.Smtp smtp = new ChannelDef.Smtp("smtp.example.com", 587, "orbit", "orbit@example.com", "STARTTLS");
        ChannelDef c = channel(ChannelDef.Type.EMAIL, null, "smtp-pass", List.of("ops@example.com", "noc@example.com"),
                smtp);
        List<String> payloads = delivery.payloads(c, notification);
        assertThat(payloads).singleElement().satisfies(p -> assertThat(p).doesNotContain("smtp-pass"));

        delivery.deliver(c, payloads.getFirst());
        assertThat(mails).singleElement().satisfies(m -> {
            assertThat(m.to()).containsExactly("ops@example.com", "noc@example.com");
            assertThat(m.subject()).isEqualTo("Queue is down");
            assertThat(m.body()).contains("QTY 347 > 200", "http://orbit.local/incidents/inc_1");
            assertThat(m.password()).isEqualTo("smtp-pass");
            assertThat(m.smtp().host()).isEqualTo("smtp.example.com");
            assertThat(m.toString()).doesNotContain("smtp-pass");
        });
    }

    @Test
    @DisplayName("channel definitions are validated per type")
    void validation() {
        assertThat(ChannelDelivery.problems(channel(ChannelDef.Type.TELEGRAM, null, null, List.of(), null)))
                .contains("chn: token is required", "chn: at least one recipient");
        assertThat(ChannelDelivery.problems(channel(ChannelDef.Type.EMAIL, null, null, List.of("not-an-email"),
                new ChannelDef.Smtp(null, null, null, null, "SSLv3"))))
                .contains("chn: smtp.host is required", "chn: smtp.from is required",
                        "chn: invalid e-mail address #1", "chn: smtp.security must be NONE, STARTTLS or TLS");
        assertThat(ChannelDelivery.problems(channel(ChannelDef.Type.WHATSAPP, null, "t", List.of("5511"), null)))
                .contains("chn: url is required", "chn: phone numbers must be E.164 (+5511...)");
        assertThat(ChannelDelivery.problems(channel(ChannelDef.Type.SLACK, "https://hooks", null, List.of(), null)))
                .isEmpty();
        assertThat(ChannelDelivery.problems(new ChannelDef("x", "X", ChannelDef.Type.SLACK, secrets.seal("u"), null,
                List.of(), "DOWN", true, null, List.of(), null, "fr"))).contains("x: locale must be en or pt-BR");
    }

    @Test
    @DisplayName("WhatsApp: with an approved provider template the message is a template with title and text parameters")
    void whatsappTemplate() {
        ChannelDef c = new ChannelDef("chn", "C", ChannelDef.Type.WHATSAPP, secrets.seal("https://graph.example.com/m"),
                null, List.of(), "WARN", true, secrets.seal("t"), List.of("+5511999990000"), null, "pt-BR",
                "orbit_incident");
        assertThat(delivery.payloads(c, notification).getFirst())
                .contains("\"type\":\"template\"", "\"name\":\"orbit_incident\"", "\"code\":\"pt_BR\"",
                        "Queue is down", "QTY 347 > 200");
    }
}
