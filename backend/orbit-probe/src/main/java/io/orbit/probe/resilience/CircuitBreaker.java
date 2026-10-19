package io.orbit.probe.resilience;

import java.time.Clock;
import java.time.Duration;

/**
 * BE-16: per-target circuit breaker. After {@code failureThreshold} consecutive failures the target
 * is paused for {@code pause} and reported as "no response" instead of being hammered.
 */
public class CircuitBreaker {

    public enum State { CLOSED, OPEN, HALF_OPEN }

    public CircuitBreaker(Clock clock, int failureThreshold, Duration pause) {
    }

    /** Whether a check may run against the target now (one trial is allowed when half-open). */
    public boolean allow(String target) {
        throw new UnsupportedOperationException("BE-16 circuit breaker is not implemented yet");
    }

    public void recordSuccess(String target) {
        throw new UnsupportedOperationException("BE-16 circuit breaker is not implemented yet");
    }

    public void recordFailure(String target) {
        throw new UnsupportedOperationException("BE-16 circuit breaker is not implemented yet");
    }

    public State state(String target) {
        throw new UnsupportedOperationException("BE-16 circuit breaker is not implemented yet");
    }
}
