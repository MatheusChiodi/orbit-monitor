package io.orbit.security.access;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-47 rate limiting")
class RateLimiterTest {

    private Instant now = Instant.parse("2026-10-18T12:00:00Z");
    private final Clock clock = new Clock() {
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
    };

    @Test
    @DisplayName("a burst is allowed, then requests are refused with Retry-After")
    void burst() {
        RateLimiter limiter = new RateLimiter(clock, 60, 3);
        for (int i = 0; i < 3; i++) {
            assertThat(limiter.tryAcquire("192.168.0.5").allowed()).isTrue();
        }
        RateLimiter.Decision refused = limiter.tryAcquire("192.168.0.5");
        assertThat(refused.allowed()).isFalse();
        assertThat(refused.retryAfter()).isPositive().isLessThanOrEqualTo(Duration.ofSeconds(1));
        assertThat(limiter.tryAcquire("192.168.0.6").allowed()).isTrue();
    }

    @Test
    @DisplayName("tokens refill over time; no lockout")
    void refills() {
        RateLimiter limiter = new RateLimiter(clock, 60, 1);
        limiter.tryAcquire("ip");
        assertThat(limiter.tryAcquire("ip").allowed()).isFalse();
        now = now.plusSeconds(1);
        assertThat(limiter.tryAcquire("ip").allowed()).isTrue();
    }
}
