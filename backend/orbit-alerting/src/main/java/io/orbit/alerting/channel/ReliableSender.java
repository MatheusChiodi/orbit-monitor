package io.orbit.alerting.channel;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/**
 * BE-36: channel reliability: rate limit per channel (per minute), retries with exponential backoff,
 * and an in-memory dead-letter queue for messages that could not be delivered.
 */
public class ReliableSender {

    /** Transport port: throws when delivery failed. */
    @FunctionalInterface
    public interface Transport {
        void send(String channelId, String payload) throws Exception;
    }

    public enum Outcome { SENT, RATE_LIMITED, DEAD_LETTER }

    public record DeadLetter(String channelId, String payload, String error, int attempts) {
    }

    private static final int MAX_DEAD_LETTERS = 500;

    private final Transport transport;
    private final Clock clock;
    private final int maxPerMinute;
    private final int attempts;
    private final Duration backoff;
    private final Consumer<Duration> sleeper;
    private final Map<String, Deque<Instant>> sent = new ConcurrentHashMap<>();
    private final Deque<DeadLetter> deadLetters = new ArrayDeque<>();

    public ReliableSender(Transport transport, Clock clock, int maxPerMinute, int attempts, Duration backoff,
                          Consumer<Duration> sleeper) {
        this.transport = transport;
        this.clock = clock;
        this.maxPerMinute = maxPerMinute;
        this.attempts = Math.max(1, attempts);
        this.backoff = backoff;
        this.sleeper = sleeper;
    }

    public Outcome send(String channelId, String payload) {
        if (!takeSlot(channelId)) {
            return Outcome.RATE_LIMITED;
        }
        String error = null;
        Duration delay = backoff;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                transport.send(channelId, payload);
                return Outcome.SENT;
            } catch (Exception e) {
                error = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
                if (attempt < attempts) {
                    sleeper.accept(delay);
                    delay = delay.multipliedBy(2);
                }
            }
        }
        synchronized (deadLetters) {
            deadLetters.addLast(new DeadLetter(channelId, payload, error, attempts));
            while (deadLetters.size() > MAX_DEAD_LETTERS) {
                deadLetters.removeFirst();
            }
        }
        return Outcome.DEAD_LETTER;
    }

    public List<DeadLetter> deadLetters() {
        synchronized (deadLetters) {
            return List.copyOf(deadLetters);
        }
    }

    private boolean takeSlot(String channelId) {
        Deque<Instant> times = sent.computeIfAbsent(channelId, c -> new ArrayDeque<>());
        synchronized (times) {
            Instant now = clock.instant();
            while (!times.isEmpty() && !times.peekFirst().isAfter(now.minus(Duration.ofMinutes(1)))) {
                times.removeFirst();
            }
            if (times.size() >= maxPerMinute) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
