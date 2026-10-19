package io.orbit.api.web;

import io.orbit.alerting.channel.ChannelDef;
import io.orbit.config.ConfigFile;
import io.orbit.security.audit.AuditLog;
import io.orbit.security.vault.SecretRef;
import io.orbit.security.vault.SecretResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Notification channels (orbit.channels.json). The URL and signing secret are write-only. */
@RestController
@RequestMapping("/api/channels")
public class ChannelController {

    /** {@code url}/{@code signingSecret} are sealed into the vault; omit them on update to keep the current ones. */
    public record ChannelRequest(String name, ChannelDef.Type type, String url, String signingSecret,
                                 List<String> groupIds, String minSeverity, Boolean enabled) {
    }

    public record ChannelView(String id, String name, ChannelDef.Type type, String url, String signingSecret,
                              List<String> groupIds, String minSeverity, boolean enabled) {
    }

    private final ConfigFile<ChannelDef> file;
    private final SecretResolver secrets;
    private final AuditLog audit;

    public ChannelController(ConfigFile<ChannelDef> file, SecretResolver secrets, AuditLog audit) {
        this.file = file;
        this.secrets = secrets;
        this.audit = audit;
    }

    @GetMapping
    public List<ChannelView> list() {
        return file.items().stream().map(ChannelController::view).toList();
    }

    @PutMapping("/{id}")
    public synchronized ChannelView save(@PathVariable String id, @RequestBody ChannelRequest body,
                                         @RequestHeader(value = Operators.HEADER, required = false) String header,
                                         HttpServletRequest request) {
        String operator = Operators.require(header, null);
        Optional<ChannelDef> current = file.items().stream().filter(c -> c.id().equals(id)).findFirst();
        SecretRef url = body.url() == null || body.url().isBlank()
                ? current.map(ChannelDef::url).orElse(null) : secrets.seal(body.url());
        SecretRef signing = body.signingSecret() == null || body.signingSecret().isBlank()
                ? current.map(ChannelDef::signingSecret).orElse(null) : secrets.seal(body.signingSecret());
        ChannelDef channel = new ChannelDef(id, body.name(), body.type(), url, signing, body.groupIds(),
                body.minSeverity(), body.enabled() == null || body.enabled());
        List<ChannelDef> items = new ArrayList<>(file.items().stream().filter(c -> !c.id().equals(id)).toList());
        items.add(channel);
        file.save(items);
        audit.record(operator, "channel.save", id, channel.type() + " " + channel.name(), request.getRemoteAddr());
        return view(channel);
    }

    @DeleteMapping("/{id}")
    public synchronized ResponseEntity<Void> delete(@PathVariable String id,
                                                    @RequestHeader(value = Operators.HEADER, required = false)
                                                    String header, HttpServletRequest request) {
        String operator = Operators.require(header, null);
        List<ChannelDef> remaining = file.items().stream().filter(c -> !c.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            throw new NotFoundException("Channel", id);
        }
        file.save(remaining);
        audit.record(operator, "channel.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private static ChannelView view(ChannelDef c) {
        return new ChannelView(c.id(), c.name(), c.type(), c.url() == null ? null : c.url().masked(),
                c.signingSecret() == null ? null : c.signingSecret().masked(), c.groupIds(), c.minSeverity(),
                c.enabled());
    }
}
