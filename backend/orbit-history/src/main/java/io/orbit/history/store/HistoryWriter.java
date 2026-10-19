package io.orbit.history.store;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;
import java.util.function.Consumer;

/**
 * Single writer thread fed by a lock-free queue. Producers (probes) only enqueue and never wait on
 * disk; when the queue is full the record is dropped and counted. Batches are flushed every second
 * or every 64 KB, whichever comes first.
 */
final class HistoryWriter implements AutoCloseable {

    /** Receives flushed batches and periodic ticks on the writer thread. */
    interface Sink {
        void write(List<Object> batch) throws Exception;

        void tick(long nowMillis) throws Exception;
    }

    static final long FLUSH_NANOS = TimeUnit.SECONDS.toNanos(1);
    static final int FLUSH_BYTES = 64 * 1024;
    /** Rough encoded size of one record, used to apply the 64 KB flush threshold. */
    static final int RECORD_BYTES = 10;
    private static final long IDLE_PARK_NANOS = TimeUnit.MILLISECONDS.toNanos(10);

    private record FlushRequest(CompletableFuture<Void> done) {
    }

    private final ConcurrentLinkedQueue<Object> queue = new ConcurrentLinkedQueue<>();
    private final AtomicInteger queued = new AtomicInteger();
    private final AtomicLong dropped = new AtomicLong();
    private final int capacity;
    private final Sink sink;
    private final java.time.Clock clock;
    private final Consumer<String> warnings;
    private final Thread thread;
    private volatile boolean running = true;

    HistoryWriter(Sink sink, java.time.Clock clock, int capacity, Consumer<String> warnings) {
        this.sink = sink;
        this.clock = clock;
        this.capacity = capacity;
        this.warnings = warnings;
        this.thread = Thread.ofPlatform().name("orbit-history-writer").daemon(true).unstarted(this::run);
    }

    void start() {
        thread.start();
    }

    /** Non-blocking; false when the queue is full or the writer stopped (the record is dropped). */
    boolean offer(Object record) {
        if (!running || queued.incrementAndGet() > capacity) {
            queued.decrementAndGet();
            dropped.incrementAndGet();
            return false;
        }
        queue.offer(record);
        return true;
    }

    /** Completes once everything enqueued before this call is written and synced. */
    CompletableFuture<Void> flush() {
        CompletableFuture<Void> done = new CompletableFuture<>();
        queue.offer(new FlushRequest(done));
        LockSupport.unpark(thread);
        return done;
    }

    long dropped() {
        return dropped.get();
    }

    int queued() {
        return queued.get();
    }

    @Override
    public void close() throws InterruptedException {
        running = false;
        LockSupport.unpark(thread);
        thread.join(TimeUnit.SECONDS.toMillis(10));
    }

    private void run() {
        List<Object> batch = new ArrayList<>();
        List<FlushRequest> waiting = new ArrayList<>();
        long lastFlush = System.nanoTime();
        while (running || !queue.isEmpty()) {
            Object item;
            int drained = 0;
            while ((item = queue.poll()) != null) {
                if (item instanceof FlushRequest request) {
                    waiting.add(request);
                    break;
                }
                queued.decrementAndGet();
                batch.add(item);
                drained++;
                if (batch.size() * RECORD_BYTES >= FLUSH_BYTES) {
                    write(batch);
                    lastFlush = System.nanoTime();
                }
            }
            if (!waiting.isEmpty() || (!batch.isEmpty() && System.nanoTime() - lastFlush >= FLUSH_NANOS)) {
                write(batch);
                lastFlush = System.nanoTime();
                waiting.forEach(w -> w.done().complete(null));
                waiting.clear();
            }
            tick();
            if (drained == 0 && waiting.isEmpty() && running) {
                LockSupport.parkNanos(IDLE_PARK_NANOS);
            }
        }
        write(batch);
        waiting.forEach(w -> w.done().complete(null));
        for (Object left; (left = queue.poll()) != null; ) {
            if (left instanceof FlushRequest request) {
                request.done().complete(null);
            }
        }
    }

    private void write(List<Object> batch) {
        if (batch.isEmpty()) {
            return;
        }
        try {
            sink.write(batch);
        } catch (Exception e) {
            dropped.addAndGet(batch.size());
            warnings.accept("history write failed: " + e.getClass().getSimpleName());
        }
        batch.clear();
    }

    private void tick() {
        try {
            sink.tick(clock.millis());
        } catch (Exception e) {
            warnings.accept("history maintenance failed: " + e.getClass().getSimpleName());
        }
    }
}
