package io.orbit.alerting.channel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.security.vault.SecretResolver;

import java.net.URI;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * BE-28: turns a masked notification into each channel's payloads and delivers one payload: webhooks
 * (Slack, Teams, HMAC-signed), Telegram Bot API, a WhatsApp provider (Cloud API style: bearer token,
 * one text per phone) and SMTP e-mail. Secrets are resolved from the vault only at delivery time and
 * never appear in payloads or error messages.
 */
public class ChannelDelivery {

    static final String TELEGRAM_API = "https://api.telegram.org";
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern PHONE = Pattern.compile("^\\+[1-9][0-9]{7,14}$");
    private static final Set<String> SECURITY = Set.of("NONE", "STARTTLS", "TLS");
    private static final Set<String> LOCALES = Set.of("en", "pt-BR");
    private static final ObjectMapper JSON = new ObjectMapper();

    private final NotificationDispatcher.HttpPoster poster;
    private final EmailSender email;
    private final SecretResolver secrets;
    private final Clock clock;

    public ChannelDelivery(NotificationDispatcher.HttpPoster poster, EmailSender email, SecretResolver secrets,
                           Clock clock) {
        this.poster = poster;
        this.email = email;
        this.secrets = secrets;
        this.clock = clock;
    }

    /** What is wrong with a channel definition (empty when valid), prefixed with its id. */
    public static List<String> problems(ChannelDef c) {
        List<String> problems = new ArrayList<>();
        if (c.type() == null) {
            problems.add(c.id() + ": type is required (SLACK, TEAMS, WEBHOOK, EMAIL, TELEGRAM or WHATSAPP)");
            return problems;
        }
        if (!"WARN".equals(c.minSeverity()) && !"DOWN".equals(c.minSeverity())) {
            problems.add(c.id() + ": minSeverity must be WARN or DOWN");
        }
        if (!LOCALES.contains(c.locale())) {
            problems.add(c.id() + ": locale must be en or pt-BR");
        }
        switch (c.type()) {
            case SLACK, TEAMS, WEBHOOK -> require(c.url() != null, c.id() + ": url is required", problems);
            case TELEGRAM -> {
                require(c.token() != null, c.id() + ": token is required", problems);
                require(!c.recipients().isEmpty(), c.id() + ": at least one recipient", problems);
            }
            case WHATSAPP -> {
                require(c.url() != null, c.id() + ": url is required", problems);
                require(c.token() != null, c.id() + ": token is required", problems);
                require(!c.recipients().isEmpty(), c.id() + ": at least one recipient", problems);
                require(c.recipients().stream().allMatch(r -> PHONE.matcher(r).matches()),
                        c.id() + ": phone numbers must be E.164 (+5511...)", problems);
            }
            case EMAIL -> email(c, problems);
        }
        return problems;
    }

    private static void email(ChannelDef c, List<String> problems) {
        ChannelDef.Smtp smtp = c.smtp();
        require(smtp != null && smtp.host() != null && !smtp.host().isBlank(), c.id() + ": smtp.host is required",
                problems);
        require(smtp != null && smtp.from() != null && EMAIL.matcher(smtp.from()).matches(),
                c.id() + ": smtp.from is required", problems);
        require(smtp == null || SECURITY.contains(smtp.securityOrDefault()),
                c.id() + ": smtp.security must be NONE, STARTTLS or TLS", problems);
        require(!c.recipients().isEmpty(), c.id() + ": at least one recipient", problems);
        for (int i = 0; i < c.recipients().size(); i++) {
            // The index, not the address: validation messages may be shown or logged.
            require(EMAIL.matcher(c.recipients().get(i)).matches(), c.id() + ": invalid e-mail address #" + (i + 1),
                    problems);
        }
    }

    private static void require(boolean ok, String problem, List<String> problems) {
        if (!ok) {
            problems.add(problem);
        }
    }

    /** One payload per delivery: a single message for webhooks and e-mail, one per chat or phone otherwise. */
    public List<String> payloads(ChannelDef channel, ChannelPayloads.Notification n) {
        return switch (channel.type()) {
            case SLACK -> List.of(ChannelPayloads.slack(n));
            case TEAMS -> List.of(ChannelPayloads.teams(n));
            case WEBHOOK -> List.of(ChannelPayloads.webhook(n));
            case EMAIL -> List.of(ChannelPayloads.email(n, channel.recipients()));
            case TELEGRAM -> channel.recipients().stream().map(chat -> ChannelPayloads.telegram(n, chat)).toList();
            case WHATSAPP -> channel.recipients().stream().map(phone -> channel.providerTemplate() == null
                    ? ChannelPayloads.whatsapp(n, phone)
                    : ChannelPayloads.whatsappTemplate(n, phone, channel.providerTemplate(), channel.locale())).toList();
        };
    }

    /** Delivers one payload; throws when the channel did not accept it. */
    public void deliver(ChannelDef channel, String payload) throws Exception {
        switch (channel.type()) {
            case SLACK, TEAMS, WEBHOOK -> webhook(channel, payload);
            case TELEGRAM -> telegram(channel, payload);
            case WHATSAPP -> {
                Map<String, String> headers = json();
                headers.put("Authorization", "Bearer " + secrets.resolve(channel.token()));
                poster.post(URI.create(secrets.resolve(channel.url())), headers, payload);
            }
            case EMAIL -> {
                JsonNode mail = JSON.readTree(payload);
                List<String> to = new ArrayList<>();
                mail.path("to").forEach(node -> to.add(node.asText()));
                email.send(new EmailSender.EmailMessage(channel.smtp(),
                        channel.token() == null ? null : secrets.resolve(channel.token()), to,
                        mail.path("subject").asText(), mail.path("body").asText()));
            }
        }
    }

    private void webhook(ChannelDef channel, String payload) throws Exception {
        Map<String, String> headers = json();
        if (channel.type() == ChannelDef.Type.WEBHOOK && channel.signingSecret() != null) {
            headers.putAll(ChannelPayloads.signatureHeaders(payload, secrets.resolve(channel.signingSecret()),
                    clock.instant().getEpochSecond()));
        }
        poster.post(URI.create(secrets.resolve(channel.url())), headers, payload);
    }

    private void telegram(ChannelDef channel, String payload) throws Exception {
        String token = secrets.resolve(channel.token());
        String base = channel.url() == null ? TELEGRAM_API : secrets.resolve(channel.url());
        base = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        try {
            poster.post(URI.create(base + "/bot" + token + "/sendMessage"), json(), payload);
        } catch (Exception e) {
            // The bot token is part of the URL: keep it out of logs and the dead-letter queue.
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            throw new IllegalStateException(message.replace(token, "••••"));
        }
    }

    private static Map<String, String> json() {
        return new HashMap<>(Map.of("Content-Type", "application/json"));
    }
}
