package io.orbit.telemetry;

import io.orbit.common.event.MonitorStateChanged;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BE-25: a monitor that changes state {@code maxChanges} times within {@code window} is FLAPPING;
 * alerting then keeps a single incident instead of one per change.
 */
public class FlappingDetector {

    private final int maxChanges;
    private final Duration window;
    private final Map<String, Deque<Instant>> changes = new ConcurrentHashMap<>();

    public FlappingDetector(int maxChanges, Duration window) {
        if (maxChanges < 2) {
            throw new IllegalArgumentException("maxChanges must be at least 2: " + maxChanges);
        }
        if (window == null || window.isNegative() || window.isZero()) {
            throw new IllegalArgumentException("window must be positive");
        }
        this.maxChanges = maxChanges;
        this.window = window;
    }

    /** Records a confirmed change; returns whether the monitor is flapping now. */
    public boolean observe(MonitorStateChanged change) {
        Deque<Instant> times = changes.computeIfAbsent(change.monitorId(), id -> new ArrayDeque<>());
        synchronized (times) {
            times.addLast(change.at());
            return countRecent(times, change.at()) >= maxChanges;
        }
    }

    public boolean isFlapping(String monitorId, Instant now) {
        Deque<Instant> times = changes.get(monitorId);
        if (times == null) {
            return false;
        }
        synchronized (times) {
            return countRecent(times, now) >= maxChanges;
        }
    }

    public void forget(String monitorId) {
        changes.remove(monitorId);
    }

    /** Drops changes older than the window (keeps memory bounded) and counts those up to {@code now}. */
    private int countRecent(Deque<Instant> times, Instant now) {
        Instant from = now.minus(window);
        while (!times.isEmpty() && times.peekFirst().isBefore(from)) {
            times.pollFirst();
        }
        return (int) times.stream().filter(t -> !t.isAfter(now)).count();
    }
}
