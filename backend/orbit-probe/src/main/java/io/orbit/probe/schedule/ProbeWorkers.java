package io.orbit.probe.schedule;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.function.Consumer;

/**
 * Virtual-thread workers that take monitor ids from the queue and run their check. A failing
 * check is logged and never stops the worker; the monitor is always released afterwards.
 */
public class ProbeWorkers {

    private static final Logger LOG = LoggerFactory.getLogger(ProbeWorkers.class);

    private final BlockingQueue<String> queue;
    private final ProbeScheduler scheduler;
    private final Consumer<String> check;
    private final List<Thread> threads = new ArrayList<>();

    public ProbeWorkers(BlockingQueue<String> queue, ProbeScheduler scheduler, Consumer<String> check) {
        this.queue = queue;
        this.scheduler = scheduler;
        this.check = check;
    }

    public synchronized void start(int count) {
        for (int i = 0; i < count; i++) {
            threads.add(Thread.ofVirtual().name("orbit-probe-", i).start(this::loop));
        }
    }

    public synchronized void stop() {
        threads.forEach(Thread::interrupt);
        for (Thread t : threads) {
            try {
                t.join(2_000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        threads.clear();
    }

    private void loop() {
        while (!Thread.currentThread().isInterrupted()) {
            String monitorId;
            try {
                monitorId = queue.take();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            try {
                check.accept(monitorId);
            } catch (RuntimeException e) {
                LOG.warn("Check {} failed unexpectedly: {}", monitorId, e.getClass().getSimpleName());
            } finally {
                scheduler.completed(monitorId);
            }
        }
    }
}
