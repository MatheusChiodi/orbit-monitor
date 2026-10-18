package io.orbit.probe.schedule;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Local scheduler (no Redis): {@link #tick()} is called every second and enqueues the monitors
 * that are due into an in-memory {@link BlockingQueue}. A monitor never runs twice at the same
 * time: it stays "in flight" until the worker calls {@link #completed(String)}.
 */
public class ProbeScheduler {

    private record Entry(Duration interval, Instant nextDue, Instant lastRun) {
    }

    private final Clock clock;
    private final BlockingQueue<String> queue;
    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Set<String> inFlight = ConcurrentHashMap.newKeySet();

    public ProbeScheduler(Clock clock, BlockingQueue<String> queue) {
        this.clock = clock;
        this.queue = queue;
    }

    /** Adds a monitor (runs at the next tick) or changes the interval of a scheduled one. */
    public void schedule(String monitorId, Duration interval) {
        entries.compute(monitorId, (id, current) -> {
            if (current == null) {
                return new Entry(interval, clock.instant(), null);
            }
            Instant byNewInterval = current.lastRun() == null ? current.nextDue() : current.lastRun().plus(interval);
            Instant next = byNewInterval.isBefore(current.nextDue()) ? byNewInterval : current.nextDue();
            return new Entry(interval, next, current.lastRun());
        });
    }

    public void unschedule(String monitorId) {
        entries.remove(monitorId);
    }

    public synchronized List<String> tick() {
        Instant now = clock.instant();
        List<String> enqueued = new ArrayList<>();
        for (Map.Entry<String, Entry> e : entries.entrySet()) {
            Entry entry = e.getValue();
            if (!entry.nextDue().isAfter(now) && enqueue(e.getKey())) {
                e.setValue(new Entry(entry.interval(), now.plus(entry.interval()), now));
                enqueued.add(e.getKey());
            }
        }
        return enqueued;
    }

    /** "Test now": enqueues immediately unless the monitor is already running. */
    public synchronized boolean runNow(String monitorId) {
        return enqueue(monitorId);
    }

    public void completed(String monitorId) {
        inFlight.remove(monitorId);
    }

    public Set<String> scheduled() {
        return Set.copyOf(entries.keySet());
    }

    public Set<String> inFlight() {
        return Set.copyOf(inFlight);
    }

    private boolean enqueue(String monitorId) {
        if (!inFlight.add(monitorId)) {
            return false;
        }
        if (!queue.offer(monitorId)) {
            inFlight.remove(monitorId);
            return false;
        }
        return true;
    }
}
