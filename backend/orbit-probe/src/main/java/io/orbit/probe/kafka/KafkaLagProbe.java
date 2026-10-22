package io.orbit.probe.kafka;

import java.util.Collections;
import java.util.Map;
import java.util.TreeMap;

/** BE-10: consumer lag per group and topic (end offset minus committed offset), stored as a series. */
public class KafkaLagProbe {

    /** Offsets port (Kafka AdminClient in production). Keys are partition numbers. */
    public interface OffsetSource {
        Map<Integer, Long> endOffsets(String topic) throws Exception;

        Map<Integer, Long> committedOffsets(String group, String topic) throws Exception;
    }

    /** @param perPartition lag of each partition; partitions without a commit count their whole end offset */
    public record LagResult(long totalLag, Map<Integer, Long> perPartition, String error) {
    }

    private final OffsetSource source;

    public KafkaLagProbe(OffsetSource source) {
        this.source = source;
    }

    public LagResult lag(String group, String topic) {
        try {
            Map<Integer, Long> end = source.endOffsets(topic);
            Map<Integer, Long> committed = source.committedOffsets(group, topic);
            Map<Integer, Long> perPartition = new TreeMap<>();
            long total = 0;
            for (Map.Entry<Integer, Long> e : end.entrySet()) {
                long endOffset = e.getValue() == null ? 0 : e.getValue();
                Long commit = committed.get(e.getKey());
                // A commit ahead of the end offset (truncated log, stale metadata) is never negative lag.
                long lag = Math.max(0, endOffset - (commit == null ? 0 : commit));
                perPartition.put(e.getKey(), lag);
                total += lag;
            }
            return new LagResult(total, Collections.unmodifiableMap(perPartition), null);
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            String detail = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return new LagResult(0, Map.of(), "Offsets unavailable: " + detail);
        }
    }
}
