package io.orbit.security.access;

import java.time.Clock;
import java.time.Duration;

/** BE-47: per client IP token bucket for the API and Push endpoints (no lockout: it only slows down). */
public class RateLimiter {

    /** @param retryAfter how long until the next request would be accepted (zero when allowed) */
    public record Decision(boolean allowed, Duration retryAfter) {
    }

    public RateLimiter(Clock clock, int requestsPerMinute, int burst) {
    }

    public Decision tryAcquire(String clientIp) {
        throw new UnsupportedOperationException("BE-47 rate limiting is not implemented yet");
    }
}
