package io.orbit.probe.resilience;

import java.util.Optional;

/**
 * BE-15: per-target isolation, one query at a time per connection, so Orbit never piles queries
 * on the database it watches. (The dedicated small HikariCP pool lives in the API runtime.)
 */
public class TargetLimiter {

    /** Held while the query runs; closing it releases the target. */
    public interface Permit extends AutoCloseable {
        @Override
        void close();
    }

    public TargetLimiter(int concurrentPerTarget) {
    }

    /** A permit when the target is free, empty when a query is already running there. */
    public Optional<Permit> tryAcquire(String target) {
        throw new UnsupportedOperationException("BE-15 per-target isolation is not implemented yet");
    }
}
