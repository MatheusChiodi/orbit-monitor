package io.orbit.probe.resilience;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.function.Supplier;

/** BE-18: N attempts with exponential backoff before a check is reported as failed. */
public record RetryPolicy(int attempts, Duration initialDelay, double multiplier, Duration maxDelay) {

    public RetryPolicy {
        if (attempts < 1) {
            throw new IllegalArgumentException("attempts must be at least 1");
        }
        Objects.requireNonNull(initialDelay, "initialDelay");
        Objects.requireNonNull(maxDelay, "maxDelay");
        if (initialDelay.isNegative() || maxDelay.isNegative()) {
            throw new IllegalArgumentException("delays must not be negative");
        }
        if (multiplier < 1.0) {
            throw new IllegalArgumentException("multiplier must be at least 1");
        }
    }

    /** Sleeping port so tests do not wait. */
    @FunctionalInterface
    public interface Sleeper {
        void sleep(Duration duration) throws InterruptedException;
    }

    /** Delays between attempts (attempts - 1 values). */
    public List<Duration> delays() {
        List<Duration> delays = new ArrayList<>(attempts - 1);
        double nextMs = initialDelay.toMillis();
        long capMs = maxDelay.toMillis();
        for (int i = 1; i < attempts; i++) {
            delays.add(Duration.ofMillis((long) Math.min(nextMs, capMs)));
            nextMs = Math.min(nextMs * multiplier, capMs);
        }
        return List.copyOf(delays);
    }

    /** Runs until {@code success} accepts the result or attempts run out; returns the last result. */
    public <T> T run(Supplier<T> attempt, Predicate<T> success, Sleeper sleeper) {
        List<Duration> delays = delays();
        T result = attempt.get();
        for (Duration delay : delays) {
            if (success.test(result)) {
                return result;
            }
            try {
                sleeper.sleep(delay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return result;
            }
            result = attempt.get();
        }
        return result;
    }
}
