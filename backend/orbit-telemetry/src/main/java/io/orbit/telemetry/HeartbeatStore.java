package io.orbit.telemetry;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory heartbeat ring buffers, one per monitor, bounded by a time window (24 h by default)
 * and a maximum count. Everything is lost on restart, by design (no Orbit database).
 */
public class HeartbeatStore {

    public static final Duration DEFAULT_WINDOW = Duration.ofHours(24);

    private final Duration window;
    private final int maxPerMonitor;
    private final Map<String, Deque<Heartbeat>> buffers = new ConcurrentHashMap<>();

    public HeartbeatStore(Duration window, int maxPerMonitor) {
        this.window = window;
        this.maxPerMonitor = maxPerMonitor;
    }

    public void record(Heartbeat heartbeat) {
        Deque<Heartbeat> buffer = buffers.computeIfAbsent(heartbeat.monitorId(), id -> new ArrayDeque<>());
        synchronized (buffer) {
            buffer.addLast(heartbeat);
            Instant cutoff = heartbeat.at().minus(window);
            while (!buffer.isEmpty() && (buffer.size() > maxPerMonitor || buffer.peekFirst().at().isBefore(cutoff))) {
                buffer.removeFirst();
            }
        }
    }

    public List<Heartbeat> history(String monitorId) {
        Deque<Heartbeat> buffer = buffers.get(monitorId);
        if (buffer == null) {
            return List.of();
        }
        synchronized (buffer) {
            return List.copyOf(buffer);
        }
    }

    public List<Heartbeat> history(String monitorId, Instant since) {
        return history(monitorId).stream().filter(h -> !h.at().isBefore(since)).toList();
    }

    public Optional<Heartbeat> latest(String monitorId) {
        List<Heartbeat> history = history(monitorId);
        return history.isEmpty() ? Optional.empty() : Optional.of(history.getLast());
    }

    /** Oldest heartbeat still in memory: the UI shows it as "history available since". */
    public Optional<Instant> coverageStart(String monitorId) {
        List<Heartbeat> history = history(monitorId);
        return history.isEmpty() ? Optional.empty() : Optional.of(history.getFirst().at());
    }

    public Set<String> monitorIds() {
        return Set.copyOf(buffers.keySet());
    }

    public void forget(String monitorId) {
        buffers.remove(monitorId);
    }
}
