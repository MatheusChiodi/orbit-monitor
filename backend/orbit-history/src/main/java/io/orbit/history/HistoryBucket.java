package io.orbit.history;

import java.time.Instant;

/**
 * Aggregate of one key over one rollup bucket. Latency figures cover answered checks (OK/WARN);
 * {@code latencyP95} is present only for hourly buckets. Null fields mean "no data".
 */
public record HistoryBucket(Instant start, long count, long ok, long warn, long down, long unknown,
                            Long latencyMin, Long latencyMax, Double latencyMean, Long latencyP95,
                            Double valueMin, Double valueMax, Double valueMean) {
}
