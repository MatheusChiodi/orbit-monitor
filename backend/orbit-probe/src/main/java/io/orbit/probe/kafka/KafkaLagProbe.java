package io.orbit.probe.kafka;

import java.util.Map;

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

    public KafkaLagProbe(OffsetSource source) {
    }

    public LagResult lag(String group, String topic) {
        throw new UnsupportedOperationException("BE-10 Kafka consumer lag probe is not implemented yet");
    }
}
