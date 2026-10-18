package io.orbit.probe.schedule;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class ProbeSchedulerTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final MutableClock clock = new MutableClock(T0);
    private final LinkedBlockingQueue<String> queue = new LinkedBlockingQueue<>();
    private final ProbeScheduler scheduler = new ProbeScheduler(clock, queue);

    @Test
    void newMonitorRunsImmediatelyThenEveryInterval() {
        scheduler.schedule("m", Duration.ofSeconds(30));

        assertThat(scheduler.tick()).containsExactly("m");
        scheduler.completed("m");
        clock.advance(Duration.ofSeconds(29));
        assertThat(scheduler.tick()).isEmpty();
        clock.advance(Duration.ofSeconds(1));
        assertThat(scheduler.tick()).containsExactly("m");
        assertThat(queue).containsExactly("m", "m");
    }

    @Test
    void aMonitorStillRunningIsNotEnqueuedTwice() {
        scheduler.schedule("m", Duration.ofSeconds(15));
        scheduler.tick();
        clock.advance(Duration.ofSeconds(20));

        assertThat(scheduler.tick()).isEmpty();
        scheduler.completed("m");
        assertThat(scheduler.tick()).containsExactly("m");
    }

    @Test
    void unscheduledMonitorsStop() {
        scheduler.schedule("m", Duration.ofSeconds(15));
        scheduler.unschedule("m");
        assertThat(scheduler.tick()).isEmpty();
        assertThat(scheduler.scheduled()).isEmpty();
    }

    @Test
    void reschedulingKeepsTheNextRunButChangesTheInterval() {
        scheduler.schedule("m", Duration.ofSeconds(60));
        scheduler.tick();
        scheduler.completed("m");
        scheduler.schedule("m", Duration.ofSeconds(15));

        clock.advance(Duration.ofSeconds(15));
        assertThat(scheduler.tick()).containsExactly("m");
    }

    @Test
    void runNowEnqueuesOutOfSchedule() {
        scheduler.schedule("m", Duration.ofMinutes(10));
        scheduler.tick();
        scheduler.completed("m");

        assertThat(scheduler.runNow("m")).isTrue();
        assertThat(scheduler.runNow("m")).isFalse();
        assertThat(queue).containsExactly("m", "m");
    }

    @Test
    void workersRunChecksAndReleaseTheMonitor() throws Exception {
        List<String> ran = new CopyOnWriteArrayList<>();
        CountDownLatch done = new CountDownLatch(2);
        ProbeWorkers workers = new ProbeWorkers(queue, scheduler, id -> {
            ran.add(id);
            done.countDown();
        });
        scheduler.schedule("a", Duration.ofSeconds(30));
        scheduler.schedule("b", Duration.ofSeconds(30));

        workers.start(2);
        scheduler.tick();

        assertThat(done.await(5, TimeUnit.SECONDS)).isTrue();
        workers.stop();
        assertThat(ran).containsExactlyInAnyOrder("a", "b");
        assertThat(scheduler.inFlight()).isEmpty();
    }

    @Test
    void aFailingCheckDoesNotKillTheWorker() throws Exception {
        CountDownLatch second = new CountDownLatch(1);
        ProbeWorkers workers = new ProbeWorkers(queue, scheduler, id -> {
            if (id.equals("boom")) {
                throw new IllegalStateException("boom");
            }
            second.countDown();
        });
        workers.start(1);
        scheduler.schedule("boom", Duration.ofSeconds(30));
        scheduler.tick();
        scheduler.schedule("ok", Duration.ofSeconds(30));
        scheduler.tick();

        assertThat(second.await(5, TimeUnit.SECONDS)).isTrue();
        workers.stop();
    }

    static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
