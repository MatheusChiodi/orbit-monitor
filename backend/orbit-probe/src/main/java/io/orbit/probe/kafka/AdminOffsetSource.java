package io.orbit.probe.kafka;

import io.orbit.probe.http.SsrfGuard;
import org.apache.kafka.clients.admin.Admin;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.DescribeTopicsOptions;
import org.apache.kafka.clients.admin.ListConsumerGroupOffsetsOptions;
import org.apache.kafka.clients.admin.ListOffsetsOptions;
import org.apache.kafka.clients.admin.OffsetSpec;
import org.apache.kafka.clients.admin.TopicDescription;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.TopicPartitionInfo;

import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * BE-10 production offsets: Kafka Admin API ({@code describeTopics}, {@code listOffsets(latest)},
 * {@code listConsumerGroupOffsets}). Read-only: no consumer joins the group, so measuring the lag
 * never triggers a rebalance. Bootstrap hosts pass the SSRF guard; the brokers' advertised
 * addresses are used as Kafka returns them.
 */
public class AdminOffsetSource implements KafkaLagProbe.OffsetSource, AutoCloseable {

    private final SsrfGuard guard;
    private final String bootstrapServers;
    private final Duration timeout;
    private final Function<Properties, Admin> factory;
    private Admin admin;

    public AdminOffsetSource(SsrfGuard guard, String bootstrapServers, Duration timeout) {
        this(guard, bootstrapServers, timeout, Admin::create);
    }

    AdminOffsetSource(SsrfGuard guard, String bootstrapServers, Duration timeout, Function<Properties, Admin> factory) {
        this.guard = guard;
        this.bootstrapServers = Arrays.stream(bootstrapServers.split(",")).map(String::strip)
                .filter(s -> !s.isEmpty()).collect(Collectors.joining(","));
        this.timeout = timeout;
        this.factory = factory;
    }

    @Override
    public Map<Integer, Long> endOffsets(String topic) throws ExecutionException, InterruptedException,
            TimeoutException {
        Admin client = admin();
        TopicDescription description = client.describeTopics(List.of(topic), new DescribeTopicsOptions()
                .timeoutMs(timeoutMs())).allTopicNames().get(timeout.toMillis(), TimeUnit.MILLISECONDS).get(topic);
        Map<TopicPartition, OffsetSpec> request = new HashMap<>();
        for (TopicPartitionInfo partition : description.partitions()) {
            request.put(new TopicPartition(topic, partition.partition()), OffsetSpec.latest());
        }
        Map<Integer, Long> end = new HashMap<>();
        client.listOffsets(request, new ListOffsetsOptions().timeoutMs(timeoutMs())).all()
                .get(timeout.toMillis(), TimeUnit.MILLISECONDS)
                .forEach((tp, info) -> end.put(tp.partition(), info.offset()));
        return end;
    }

    @Override
    public Map<Integer, Long> committedOffsets(String group, String topic) throws ExecutionException,
            InterruptedException, TimeoutException {
        Map<TopicPartition, OffsetAndMetadata> offsets = admin().listConsumerGroupOffsets(group,
                        new ListConsumerGroupOffsetsOptions().timeoutMs(timeoutMs()))
                .partitionsToOffsetAndMetadata().get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        Map<Integer, Long> committed = new HashMap<>();
        offsets.forEach((tp, meta) -> {
            if (tp.topic().equals(topic) && meta != null) {
                committed.put(tp.partition(), meta.offset());
            }
        });
        return committed;
    }

    private synchronized Admin admin() {
        if (admin == null) {
            for (String server : bootstrapServers.split(",")) {
                guard.check(URI.create("http://" + server));
            }
            Properties props = new Properties();
            props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
            props.put(AdminClientConfig.CLIENT_ID_CONFIG, "orbit-monitor");
            props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, String.valueOf(timeoutMs()));
            props.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, String.valueOf(timeoutMs()));
            admin = factory.apply(props);
        }
        return admin;
    }

    private int timeoutMs() {
        return (int) Math.min(Integer.MAX_VALUE, timeout.toMillis());
    }

    @Override
    public synchronized void close() {
        if (admin != null) {
            admin.close(Duration.ofSeconds(1));
            admin = null;
        }
    }
}
