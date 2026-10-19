package io.orbit.probe.push;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-03 push monitor")
class PushRegistryTest {

    private static final Instant T0 = Instant.parse("2026-10-18T02:00:00Z");
    private final MutableClock clock = new MutableClock(T0);
    private final PushRegistry registry = new PushRegistry(clock);

    @Test
    @DisplayName("tokens are long, URL-safe and unique")
    void tokens() {
        String a = registry.register("push_batch", Duration.ofMinutes(30));
        String b = registry.register("push_other", Duration.ofMinutes(30));
        assertThat(a).matches("[A-Za-z0-9_-]{32,}").isNotEqualTo(b);
    }

    @Test
    @DisplayName("no signal yet is UNKNOWN, a signal is OK, silence beyond the limit is DOWN")
    void silenceMeansDown() {
        String token = registry.register("push_batch", Duration.ofMinutes(30));
        assertThat(registry.state("push_batch")).isEqualTo(MonitorState.UNKNOWN);

        assertThat(registry.receive(token)).contains("push_batch");
        assertThat(registry.state("push_batch")).isEqualTo(MonitorState.OK);

        clock.now = T0.plus(Duration.ofMinutes(31));
        assertThat(registry.state("push_batch")).isEqualTo(MonitorState.DOWN);
    }

    @Test
    @DisplayName("unknown or rotated tokens are rejected")
    void rejectsUnknownTokens() {
        String old = registry.register("push_batch", Duration.ofMinutes(30));
        registry.register("push_batch", Duration.ofMinutes(30));
        assertThat(registry.receive(old)).isEmpty();
        assertThat(registry.receive("guess")).isEmpty();
    }

    static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
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
