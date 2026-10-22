package io.orbit.api.web;

import io.orbit.probe.push.PushRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/**
 * BE-03: the URL a job calls when it finishes. The secret token is the only credential, so the
 * endpoint is reachable from any allowed address; an unknown token is a plain 404 that never
 * echoes the token back.
 */
@RestController
public class PushController {

    public record PushAck(String monitorId, Instant receivedAt) {
    }

    private final PushRegistry registry;

    public PushController(PushRegistry registry) {
        this.registry = registry;
    }

    @PostMapping("/api/push/{token}")
    public PushAck push(@PathVariable String token) {
        String monitorId = registry.receive(token).orElseThrow(() -> new NotFoundException("Push monitor", "token"));
        return new PushAck(monitorId, registry.lastSignal(monitorId).orElse(null));
    }

    /** Some schedulers can only issue GET requests (curl in cron, health hooks). */
    @GetMapping("/api/push/{token}")
    public PushAck pushByGet(@PathVariable String token) {
        return push(token);
    }
}
