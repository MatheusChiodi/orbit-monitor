package io.orbit.alerting.channel;

import java.time.Clock;
import java.time.Duration;
import java.util.List;

/**
 * BE-36: channel reliability: rate limit per channel, retries with backoff, and a dead-letter
 * queue (in memory) for messages that could not be delivered.
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

    public ReliableSender(Transport transport, Clock clock, int maxPerMinute, int attempts, Duration backoff,
                          java.util.function.Consumer<Duration> sleeper) {
    }

    public Outcome send(String channelId, String payload) {
        throw new UnsupportedOperationException("BE-36 channel reliability is not implemented yet");
    }

    public List<DeadLetter> deadLetters() {
        throw new UnsupportedOperationException("BE-36 channel reliability is not implemented yet");
    }
}
