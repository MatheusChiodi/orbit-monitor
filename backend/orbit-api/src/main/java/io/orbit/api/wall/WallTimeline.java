package io.orbit.api.wall;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/** Wall timeline in memory: newest first, bounded by count and age. */
public class WallTimeline {

    private final int maxEvents;
    private final Duration window;
    private final Deque<WallViews.TimelineEventView> events = new ArrayDeque<>();
    private final AtomicLong sequence = new AtomicLong();

    public WallTimeline(int maxEvents, Duration window) {
        this.maxEvents = maxEvents;
        this.window = window;
    }

    public synchronized WallViews.TimelineEventView add(String kind, String title, String detail, Instant at) {
        WallViews.TimelineEventView event = new WallViews.TimelineEventView("evt_" + sequence.incrementAndGet(), at,
                kind, title, detail == null ? "" : detail);
        events.addFirst(event);
        Instant cutoff = at.minus(window);
        while (events.size() > maxEvents || (!events.isEmpty() && events.peekLast().at().isBefore(cutoff))) {
            events.removeLast();
        }
        return event;
    }

    public synchronized List<WallViews.TimelineEventView> recent() {
        return List.copyOf(events);
    }

    public synchronized Optional<Instant> lastRecoveryAt() {
        return events.stream().filter(e -> e.kind().equals("OK")).map(WallViews.TimelineEventView::at).findFirst();
    }
}
