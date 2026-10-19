package io.orbit.probe.resilience;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** Clock the test moves forward by hand. */
final class TestClock extends Clock {

    private Instant now;
    private final ZoneId zone;

    TestClock(Instant now) {
        this(now, ZoneOffset.UTC);
    }

    TestClock(Instant now, ZoneId zone) {
        this.now = now;
        this.zone = zone;
    }

    void advance(Duration d) {
        now = now.plus(d);
    }

    void set(Instant instant) {
        now = instant;
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId newZone) {
        return new TestClock(now, newZone);
    }

    @Override
    public Instant instant() {
        return now;
    }
}
