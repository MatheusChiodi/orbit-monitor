package io.orbit.probe.resilience;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-18 retries with backoff")
class RetryPolicyTest {

    private final RetryPolicy policy = new RetryPolicy(4, Duration.ofSeconds(1), 2.0, Duration.ofSeconds(3));

    @Test
    @DisplayName("exponential delays capped at the maximum")
    void delays() {
        assertThat(policy.delays()).containsExactly(Duration.ofSeconds(1), Duration.ofSeconds(2), Duration.ofSeconds(3));
    }

    @Test
    @DisplayName("stops at the first success")
    void stopsOnSuccess() {
        AtomicInteger calls = new AtomicInteger();
        List<Duration> slept = new ArrayList<>();
        String result = policy.run(() -> calls.incrementAndGet() < 3 ? "DOWN" : "OK", "OK"::equals, slept::add);
        assertThat(result).isEqualTo("OK");
        assertThat(calls).hasValue(3);
        assertThat(slept).containsExactly(Duration.ofSeconds(1), Duration.ofSeconds(2));
    }

    @Test
    @DisplayName("returns the last failure after all attempts")
    void exhausts() {
        AtomicInteger calls = new AtomicInteger();
        String result = policy.run(() -> "DOWN-" + calls.incrementAndGet(), "OK"::equals, d -> { });
        assertThat(result).isEqualTo("DOWN-4");
    }

    @Test
    @DisplayName("a single attempt never sleeps")
    void singleAttempt() {
        RetryPolicy once = new RetryPolicy(1, Duration.ofSeconds(1), 2.0, Duration.ofSeconds(3));
        assertThat(once.delays()).isEmpty();
    }
}
