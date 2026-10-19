package io.orbit.probe.push;

import io.orbit.common.MonitorState;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BE-03: push monitors. Orbit generates a secret URL token; the job calls it when it finishes.
 * No signal for longer than {@code maxSilence} means DOWN. Tokens are compared in constant time.
 */
public class PushRegistry {

    private record Entry(String token, Duration maxSilence, Instant lastSignal) {
    }

    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    public PushRegistry(Clock clock) {
        this.clock = clock;
    }

    /** Registers (or rotates) the token of a push monitor; returns the new secret token. */
    public String register(String monitorId, Duration maxSilence) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        entries.put(monitorId, new Entry(token, maxSilence, null));
        return token;
    }

    /** Keeps an existing token (loaded from config) for a monitor. */
    public void restore(String monitorId, String token, Duration maxSilence) {
        entries.compute(monitorId, (id, e) -> new Entry(token, maxSilence, e == null ? null : e.lastSignal()));
    }

    /** Records a signal; returns the monitor id when the token is valid. */
    public Optional<String> receive(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        byte[] given = token.getBytes(StandardCharsets.UTF_8);
        for (Map.Entry<String, Entry> e : entries.entrySet()) {
            if (MessageDigest.isEqual(given, e.getValue().token().getBytes(StandardCharsets.UTF_8))) {
                entries.computeIfPresent(e.getKey(),
                        (id, entry) -> new Entry(entry.token(), entry.maxSilence(), clock.instant()));
                return Optional.of(e.getKey());
            }
        }
        return Optional.empty();
    }

    public MonitorState state(String monitorId) {
        Entry entry = entries.get(monitorId);
        if (entry == null || entry.lastSignal() == null) {
            return MonitorState.UNKNOWN;
        }
        return clock.instant().isAfter(entry.lastSignal().plus(entry.maxSilence())) ? MonitorState.DOWN : MonitorState.OK;
    }

    public Optional<Instant> lastSignal(String monitorId) {
        return Optional.ofNullable(entries.get(monitorId)).map(Entry::lastSignal);
    }

    public void forget(String monitorId) {
        entries.remove(monitorId);
    }
}
