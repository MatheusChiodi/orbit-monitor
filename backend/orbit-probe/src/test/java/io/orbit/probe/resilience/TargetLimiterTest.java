package io.orbit.probe.resilience;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-15 per-target isolation")
class TargetLimiterTest {

    private final TargetLimiter limiter = new TargetLimiter(1);

    @Test
    @DisplayName("only one query at a time per connection")
    void onePerTarget() {
        Optional<TargetLimiter.Permit> first = limiter.tryAcquire("con_core");
        assertThat(first).isPresent();
        assertThat(limiter.tryAcquire("con_core")).isEmpty();
        assertThat(limiter.tryAcquire("con_other")).isPresent();

        first.get().close();
        assertThat(limiter.tryAcquire("con_core")).isPresent();
    }

    @Test
    @DisplayName("closing a permit twice releases only once")
    void idempotentRelease() {
        TargetLimiter two = new TargetLimiter(2);
        TargetLimiter.Permit a = two.tryAcquire("t").orElseThrow();
        two.tryAcquire("t").orElseThrow();
        a.close();
        a.close();
        assertThat(two.tryAcquire("t")).isPresent();
        assertThat(two.tryAcquire("t")).isEmpty();
    }
}
