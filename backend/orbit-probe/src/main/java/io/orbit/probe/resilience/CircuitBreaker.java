package io.orbit.probe.resilience;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BE-16: per-target circuit breaker. After {@code failureThreshold} consecutive failures the target
 * is paused for {@code pause} and reported as "no response" instead of being hammered; after the
 * pause a single trial check decides whether it closes again.
 */
public class CircuitBreaker {

    public enum State { CLOSED, OPEN, HALF_OPEN }

    private record Circuit(State state, int failures, Instant openedAt, boolean trialRunning) {
        static final Circuit CLOSED = new Circuit(State.CLOSED, 0, null, false);
    }

    private final Clock clock;
    private final int failureThreshold;
    private final Duration pause;
    private final Map<String, Circuit> circuits = new ConcurrentHashMap<>();

    public CircuitBreaker(Clock clock, int failureThreshold, Duration pause) {
        this.clock = clock;
        this.failureThreshold = failureThreshold;
        this.pause = pause;
    }

    /** Whether a check may run against the target now (one trial is allowed when half-open). */
    public boolean allow(String target) {
        boolean[] allowed = new boolean[1];
        circuits.compute(target, (t, current) -> {
            Circuit c = current == null ? Circuit.CLOSED : current;
            switch (c.state()) {
                case CLOSED -> allowed[0] = true;
                case OPEN -> {
                    if (!clock.instant().isBefore(c.openedAt().plus(pause))) {
                        allowed[0] = true;
                        return new Circuit(State.HALF_OPEN, c.failures(), c.openedAt(), true);
                    }
                }
                case HALF_OPEN -> {
                    if (!c.trialRunning()) {
                        allowed[0] = true;
                        return new Circuit(State.HALF_OPEN, c.failures(), c.openedAt(), true);
                    }
                }
            }
            return c;
        });
        return allowed[0];
    }

    public void recordSuccess(String target) {
        circuits.put(target, Circuit.CLOSED);
    }

    public void recordFailure(String target) {
        circuits.compute(target, (t, current) -> {
            Circuit c = current == null ? Circuit.CLOSED : current;
            if (c.state() == State.HALF_OPEN) {
                return new Circuit(State.OPEN, c.failures() + 1, clock.instant(), false);
            }
            int failures = c.failures() + 1;
            return failures >= failureThreshold
                    ? new Circuit(State.OPEN, failures, clock.instant(), false)
                    : new Circuit(c.state(), failures, c.openedAt(), false);
        });
    }

    public State state(String target) {
        return circuits.getOrDefault(target, Circuit.CLOSED).state();
    }
}
