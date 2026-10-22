package io.orbit.security.access;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** BE-47: per client IP token bucket for the API and Push endpoints (no lockout: it only slows down). */
public class RateLimiter {

    /** Upper bound on tracked clients; the least recently seen bucket is dropped first. */
    static final int MAX_CLIENTS = 10_000;

    /** @param retryAfter how long until the next request would be accepted (zero when allowed) */
    public record Decision(boolean allowed, Duration retryAfter) {
    }

    private static final class Bucket {
        private double tokens;
        private long lastNanos;

        Bucket(double tokens, long lastNanos) {
            this.tokens = tokens;
            this.lastNanos = lastNanos;
        }
    }

    private final Clock clock;
    private final double nanosPerToken;
    private final int burst;
    private final Map<String, Bucket> buckets = new LinkedHashMap<>(256, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
            return size() > MAX_CLIENTS;
        }
    };

    public RateLimiter(Clock clock, int requestsPerMinute, int burst) {
        if (requestsPerMinute <= 0 || burst <= 0) {
            throw new IllegalArgumentException("requestsPerMinute and burst must be positive");
        }
        this.clock = clock;
        this.nanosPerToken = Duration.ofMinutes(1).toNanos() / (double) requestsPerMinute;
        this.burst = burst;
    }

    public synchronized Decision tryAcquire(String clientIp) {
        long now = nowNanos();
        Bucket bucket = buckets.computeIfAbsent(clientIp == null ? "" : clientIp, k -> new Bucket(burst, now));
        long elapsed = Math.max(0, now - bucket.lastNanos);
        bucket.tokens = Math.min(burst, bucket.tokens + elapsed / nanosPerToken);
        bucket.lastNanos = now;
        if (bucket.tokens >= 1.0) {
            bucket.tokens -= 1.0;
            return new Decision(true, Duration.ZERO);
        }
        long wait = (long) Math.ceil((1.0 - bucket.tokens) * nanosPerToken);
        return new Decision(false, Duration.ofNanos(Math.max(1, wait)));
    }

    private long nowNanos() {
        Instant instant = clock.instant();
        return instant.getEpochSecond() * 1_000_000_000L + instant.getNano();
    }
}
