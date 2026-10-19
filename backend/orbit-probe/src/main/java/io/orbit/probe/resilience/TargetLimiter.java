package io.orbit.probe.resilience;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

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

    private final int concurrentPerTarget;
    private final Map<String, Semaphore> semaphores = new ConcurrentHashMap<>();

    public TargetLimiter(int concurrentPerTarget) {
        this.concurrentPerTarget = concurrentPerTarget;
    }

    /** A permit when the target is free, empty when a query is already running there. */
    public Optional<Permit> tryAcquire(String target) {
        return tryAcquire(target, Duration.ZERO);
    }

    /** Waits up to {@code wait} for the target to become free. */
    public Optional<Permit> tryAcquire(String target, Duration wait) {
        Semaphore semaphore = semaphores.computeIfAbsent(target, t -> new Semaphore(concurrentPerTarget));
        try {
            if (!semaphore.tryAcquire(wait.toMillis(), TimeUnit.MILLISECONDS)) {
                return Optional.empty();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
        AtomicBoolean released = new AtomicBoolean();
        return Optional.of(() -> {
            if (released.compareAndSet(false, true)) {
                semaphore.release();
            }
        });
    }
}
