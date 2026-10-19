package io.orbit.probe.resilience;

import java.time.Duration;
import java.util.List;
import java.util.function.Predicate;
import java.util.function.Supplier;

/** BE-18: N attempts with exponential backoff before a check is reported as failed. */
public record RetryPolicy(int attempts, Duration initialDelay, double multiplier, Duration maxDelay) {

    /** Sleeping port so tests do not wait. */
    @FunctionalInterface
    public interface Sleeper {
        void sleep(Duration duration) throws InterruptedException;
    }

    /** Delays between attempts (attempts - 1 values). */
    public List<Duration> delays() {
        throw new UnsupportedOperationException("BE-18 retries with backoff is not implemented yet");
    }

    /** Runs until {@code success} accepts the result or attempts run out; returns the last result. */
    public <T> T run(Supplier<T> attempt, Predicate<T> success, Sleeper sleeper) {
        throw new UnsupportedOperationException("BE-18 retries with backoff is not implemented yet");
    }
}
