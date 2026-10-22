package io.orbit.api.web;

import io.orbit.alerting.channel.ChannelDef;
import io.orbit.alerting.channel.NotificationDispatcher;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.config.ConfigFile;
import io.orbit.security.audit.AuditLog;
import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * BE-28: notification channels (orbit.channels.json). URL, token/password and signing secret are
 * write-only (sealed in the vault, shown as {@code •••• (vault)}); recipients are personal data and come
 * back masked. Omit a secret or the recipients on update to keep the current ones.
 */
@RestController
@RequestMapping("/api/channels")
public class ChannelController {

    public record ChannelRequest(String name, ChannelDef.Type type, String url, String signingSecret, String token,
                                 List<String> recipients, ChannelDef.Smtp smtp, List<String> groupIds,
                                 String minSeverity, Boolean enabled, String locale, String providerTemplate) {
    }

    public record ChannelView(String id, String name, ChannelDef.Type type, String url, String signingSecret,
                              String token, List<String> recipients, ChannelDef.Smtp smtp, List<String> groupIds,
                              String minSeverity, boolean enabled, String locale, String providerTemplate) {
    }

    /** @param error the provider's answer when it failed (masked) */
    public record TestResult(boolean delivered, String error) {
    }

    public record DeadLetterView(String channelId, String error, int attempts) {
    }

    private static final SensitiveDataRedactor REDACTOR = new SensitiveDataRedactor();

    private final ConfigFile<ChannelDef> file;
    private final SecretResolver secrets;
    private final NotificationDispatcher dispatcher;
    private final AuditLog audit;

    public ChannelController(ConfigFile<ChannelDef> file, SecretResolver secrets, NotificationDispatcher dispatcher,
                             AuditLog audit) {
        this.file = file;
        this.secrets = secrets;
        this.dispatcher = dispatcher;
        this.audit = audit;
    }

    @GetMapping
    public List<ChannelView> list() {
        return file.items().stream().map(ChannelController::view).toList();
    }

    /** BE-36: messages that could not be delivered after the retries (in memory). */
    @GetMapping("/dead-letters")
    public List<DeadLetterView> deadLetters() {
        return dispatcher.deadLetters().stream()
                .map(d -> new DeadLetterView(d.channelId(), REDACTOR.redactText(d.error()), d.attempts())).toList();
    }

    @PutMapping("/{id}")
    public synchronized ChannelView save(@PathVariable String id, @RequestBody ChannelRequest body,
                                         HttpServletRequest request) {
        String operator = Actors.current();
        Optional<ChannelDef> current = find(id);
        ChannelDef channel = new ChannelDef(id, body.name(), body.type(),
                secret(body.url(), current.map(ChannelDef::url)),
                secret(body.signingSecret(), current.map(ChannelDef::signingSecret)), body.groupIds(),
                body.minSeverity(), body.enabled() == null || body.enabled(),
                secret(body.token(), current.map(ChannelDef::token)), recipients(body.recipients(), current),
                body.smtp(), body.locale(), body.providerTemplate());
        List<ChannelDef> items = new ArrayList<>(file.items().stream().filter(c -> !c.id().equals(id)).toList());
        items.add(channel);
        file.save(items);
        audit.record(operator, "channel.save", id, channel.type() + " " + channel.name(), request.getRemoteAddr());
        return view(channel);
    }

    /** Sends a test message now (no retries) so the operator can check the channel. */
    @PostMapping("/{id}/test")
    public TestResult test(@PathVariable String id,
                           HttpServletRequest request) {
        String operator = Actors.current();
        ChannelDef channel = find(id).orElseThrow(() -> new NotFoundException("Channel", id));
        audit.record(operator, "channel.test", id, null, request.getRemoteAddr());
        try {
            dispatcher.test(channel);
            return new TestResult(true, null);
        } catch (Exception e) {
            String error = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return new TestResult(false, REDACTOR.redactText(error));
        }
    }

    @DeleteMapping("/{id}")
    public synchronized ResponseEntity<Void> delete(@PathVariable String id,
                                                    HttpServletRequest request) {
        String operator = Actors.current();
        List<ChannelDef> remaining = file.items().stream().filter(c -> !c.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            throw new NotFoundException("Channel", id);
        }
        file.save(remaining);
        audit.record(operator, "channel.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private Optional<ChannelDef> find(String id) {
        return file.items().stream().filter(c -> c.id().equals(id)).findFirst();
    }

    private SecretRef secret(String value, Optional<SecretRef> current) {
        return value == null || value.isBlank() ? current.orElse(null) : secrets.seal(value.strip());
    }

    /** Missing or still masked (as returned by GET) keeps the stored recipients. */
    private static List<String> recipients(List<String> requested, Optional<ChannelDef> current) {
        if (requested == null || !requested.isEmpty() && requested.stream().allMatch(r -> r != null && r.contains("•"))) {
            return current.map(ChannelDef::recipients).orElse(List.of());
        }
        return requested.stream().filter(r -> r != null && !r.isBlank()).map(String::strip).toList();
    }

    private static ChannelView view(ChannelDef c) {
        return new ChannelView(c.id(), c.name(), c.type(), masked(c.url()), masked(c.signingSecret()), masked(c.token()),
                c.recipients().stream().map(ChannelController::maskRecipient).toList(), c.smtp(), c.groupIds(),
                c.minSeverity(), c.enabled(), c.locale(), c.providerTemplate());
    }

    private static String masked(SecretRef ref) {
        return ref == null ? null : ref.masked();
    }

    /** E-mail addresses as {@code o•••@e•••.com}; chat ids and phone numbers keep their last 4 characters. */
    static String maskRecipient(String recipient) {
        if (recipient.contains("@")) {
            return REDACTOR.redactText(recipient);
        }
        return recipient.length() <= 4 ? "••••" : "••••" + recipient.substring(recipient.length() - 4);
    }
}
