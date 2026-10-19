package io.orbit.probe.resilience;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-16 circuit breaker")
class CircuitBreakerTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final TestClock clock = new TestClock(T0);
    private final CircuitBreaker breaker = new CircuitBreaker(clock, 3, Duration.ofMinutes(1));

    @Test
    @DisplayName("three consecutive failures open the circuit for one minute")
    void opensAfterThreeFailures() {
        breaker.recordFailure("con_core");
        breaker.recordFailure("con_core");
        assertThat(breaker.allow("con_core")).isTrue();
        breaker.recordFailure("con_core");

        assertThat(breaker.state("con_core")).isEqualTo(CircuitBreaker.State.OPEN);
        assertThat(breaker.allow("con_core")).isFalse();
        assertThat(breaker.allow("con_other")).isTrue();
    }

    @Test
    @DisplayName("after the pause one trial runs; success closes, failure reopens")
    void halfOpen() {
        for (int i = 0; i < 3; i++) {
            breaker.recordFailure("t");
        }
        clock.advance(Duration.ofSeconds(61));
        assertThat(breaker.allow("t")).isTrue();
        assertThat(breaker.state("t")).isEqualTo(CircuitBreaker.State.HALF_OPEN);
        assertThat(breaker.allow("t")).isFalse();

        breaker.recordFailure("t");
        assertThat(breaker.state("t")).isEqualTo(CircuitBreaker.State.OPEN);

        clock.advance(Duration.ofSeconds(61));
        breaker.allow("t");
        breaker.recordSuccess("t");
        assertThat(breaker.state("t")).isEqualTo(CircuitBreaker.State.CLOSED);
    }

    @Test
    @DisplayName("a success resets the failure count")
    void successResets() {
        breaker.recordFailure("t");
        breaker.recordFailure("t");
        breaker.recordSuccess("t");
        breaker.recordFailure("t");
        assertThat(breaker.state("t")).isEqualTo(CircuitBreaker.State.CLOSED);
    }
}
