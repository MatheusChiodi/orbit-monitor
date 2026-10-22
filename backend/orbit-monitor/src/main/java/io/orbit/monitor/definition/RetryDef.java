package io.orbit.monitor.definition;

import java.util.ArrayList;
import java.util.List;

/**
 * BE-18: attempts with exponential backoff before a check is reported as failed (DOWN).
 *
 * @param attempts       total attempts, 1 to 5 (1 = no retry)
 * @param initialDelayMs delay before the second attempt; null means 1 s
 * @param multiplier     growth of each next delay, at least 1; null means 2
 * @param maxDelayMs     cap of a single delay; null means 30 s
 */
public record RetryDef(int attempts, Integer initialDelayMs, Double multiplier, Integer maxDelayMs) {

    public static final int MAX_ATTEMPTS = 5;
    private static final int MAX_DELAY_MS = 60_000;

    public long initialDelay() {
        return initialDelayMs == null ? 1_000 : initialDelayMs;
    }

    public double growth() {
        return multiplier == null ? 2.0 : multiplier;
    }

    public long maxDelay() {
        return maxDelayMs == null ? 30_000 : maxDelayMs;
    }

    /** Problems with this policy, empty when valid. */
    public List<String> problems() {
        List<String> problems = new ArrayList<>();
        if (attempts < 1 || attempts > MAX_ATTEMPTS) {
            problems.add("retry: attempts must be between 1 and " + MAX_ATTEMPTS);
        }
        if (initialDelay() < 0 || initialDelay() > MAX_DELAY_MS || maxDelay() < 0 || maxDelay() > MAX_DELAY_MS) {
            problems.add("retry: delays must be between 0 and " + MAX_DELAY_MS + " ms");
        }
        if (growth() < 1.0 || growth() > 10.0) {
            problems.add("retry: multiplier must be between 1 and 10");
        }
        return problems;
    }
}
