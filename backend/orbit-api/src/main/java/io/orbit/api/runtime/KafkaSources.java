package io.orbit.api.runtime;

import io.orbit.probe.http.SsrfGuard;
import io.orbit.probe.kafka.AdminOffsetSource;
import io.orbit.probe.kafka.KafkaLagProbe;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** BE-10: one Admin client per bootstrap list, reused across checks and closed when unused. */
public class KafkaSources implements AutoCloseable {

    private final SsrfGuard guard;
    private final Map<String, AdminOffsetSource> sources = new ConcurrentHashMap<>();

    public KafkaSources(SsrfGuard guard) {
        this.guard = guard;
    }

    public KafkaLagProbe probe(String bootstrapServers, Duration timeout) {
        return new KafkaLagProbe(sources.computeIfAbsent(bootstrapServers,
                servers -> new AdminOffsetSource(guard, servers, timeout)));
    }

    /** Closes clients whose bootstrap list no monitor uses any more. */
    public void retain(Set<String> inUse) {
        for (String servers : Set.copyOf(sources.keySet())) {
            if (!inUse.contains(servers)) {
                AdminOffsetSource source = sources.remove(servers);
                if (source != null) {
                    source.close();
                }
            }
        }
    }

    @Override
    public void close() {
        sources.values().forEach(AdminOffsetSource::close);
        sources.clear();
    }
}
