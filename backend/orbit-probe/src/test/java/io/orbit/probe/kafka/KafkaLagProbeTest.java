package io.orbit.probe.kafka;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-10 Kafka consumer lag probe")
class KafkaLagProbeTest {

    @Test
    @DisplayName("lag is end offset minus committed offset, summed over partitions")
    void sumsLag() {
        KafkaLagProbe probe = new KafkaLagProbe(new KafkaLagProbe.OffsetSource() {
            @Override
            public Map<Integer, Long> endOffsets(String topic) {
                return Map.of(0, 100L, 1, 50L, 2, 10L);
            }

            @Override
            public Map<Integer, Long> committedOffsets(String group, String topic) {
                return Map.of(0, 90L, 1, 50L);
            }
        });

        KafkaLagProbe.LagResult r = probe.lag("settlement", "payments");

        assertThat(r.perPartition()).containsEntry(0, 10L).containsEntry(1, 0L).containsEntry(2, 10L);
        assertThat(r.totalLag()).isEqualTo(20L);
        assertThat(r.error()).isNull();
    }

    @Test
    @DisplayName("broker errors are reported, not thrown")
    void error() {
        KafkaLagProbe probe = new KafkaLagProbe(new KafkaLagProbe.OffsetSource() {
            @Override
            public Map<Integer, Long> endOffsets(String topic) throws Exception {
                throw new java.util.concurrent.TimeoutException("broker unavailable");
            }

            @Override
            public Map<Integer, Long> committedOffsets(String group, String topic) {
                return Map.of();
            }
        });
        assertThat(probe.lag("g", "t").error()).contains("broker unavailable");
    }
}
