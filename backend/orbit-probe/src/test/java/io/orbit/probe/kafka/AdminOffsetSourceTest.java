package io.orbit.probe.kafka;

import io.orbit.probe.http.SsrfBlockedException;
import io.orbit.probe.http.SsrfGuard;
import org.apache.kafka.clients.admin.Admin;
import org.apache.kafka.clients.admin.DescribeTopicsResult;
import org.apache.kafka.clients.admin.ListConsumerGroupOffsetsResult;
import org.apache.kafka.clients.admin.ListOffsetsResult;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.KafkaFuture;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionInfo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("BE-10 Kafka offsets through the Admin API")
class AdminOffsetSourceTest {

    private static final SsrfGuard GUARD = new SsrfGuard(h -> List.of(InetAddress.getLoopbackAddress()), Set.of());

    @Test
    @DisplayName("end offsets per partition (latest) and committed offsets of the group for that topic")
    void readsOffsets() throws Exception {
        Admin admin = mock(Admin.class);
        DescribeTopicsResult topics = mock(DescribeTopicsResult.class);
        TopicDescription description = new TopicDescription("invoices", false, List.of(
                new TopicPartitionInfo(0, null, List.of(), List.of()),
                new TopicPartitionInfo(1, null, List.of(), List.of())));
        when(topics.allTopicNames()).thenReturn(KafkaFuture.completedFuture(Map.of("invoices", description)));
        when(admin.describeTopics(anyCollection(), any())).thenReturn(topics);

        ListOffsetsResult offsets = mock(ListOffsetsResult.class);
        when(offsets.all()).thenReturn(KafkaFuture.completedFuture(Map.of(
                new TopicPartition("invoices", 0), new ListOffsetsResult.ListOffsetsResultInfo(120, 0L, null),
                new TopicPartition("invoices", 1), new ListOffsetsResult.ListOffsetsResultInfo(40, 0L, null))));
        when(admin.listOffsets(anyMap(), any())).thenReturn(offsets);

        ListConsumerGroupOffsetsResult committed = mock(ListConsumerGroupOffsetsResult.class);
        when(committed.partitionsToOffsetAndMetadata()).thenReturn(KafkaFuture.completedFuture(Map.of(
                new TopicPartition("invoices", 0), new OffsetAndMetadata(100),
                new TopicPartition("other", 0), new OffsetAndMetadata(5))));
        when(admin.listConsumerGroupOffsets(eq("billing"), any())).thenReturn(committed);

        AtomicReference<Properties> config = new AtomicReference<>();
        try (AdminOffsetSource source = new AdminOffsetSource(GUARD, "broker1:9092, broker2:9093",
                Duration.ofSeconds(3), props -> {
                    config.set(props);
                    return admin;
                })) {
            assertThat(source.endOffsets("invoices")).containsExactlyInAnyOrderEntriesOf(Map.of(0, 120L, 1, 40L));
            assertThat(source.committedOffsets("billing", "invoices")).containsExactlyEntriesOf(Map.of(0, 100L));
            assertThat(new KafkaLagProbe(source).lag("billing", "invoices").totalLag()).isEqualTo(60);
        }
        assertThat(config.get().getProperty("bootstrap.servers")).isEqualTo("broker1:9092,broker2:9093");
        assertThat(config.get().getProperty("request.timeout.ms")).isEqualTo("3000");
    }

    @Test
    @DisplayName("every bootstrap host passes the SSRF guard before the client is created")
    void guarded() {
        SsrfGuard metadata = new SsrfGuard(h -> List.of(InetAddress.getByName("169.254.169.254")), Set.of());
        assertThatThrownBy(() -> new AdminOffsetSource(metadata, "meta:9092", Duration.ofSeconds(1),
                props -> mock(Admin.class)).endOffsets("t")).isInstanceOf(SsrfBlockedException.class);
    }
}
