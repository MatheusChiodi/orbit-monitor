package io.orbit.monitor.definition;

import io.orbit.security.vault.SecretRef;

import java.time.Instant;
import java.util.List;

/**
 * Checks in orbit.checks.json: TCP, ping, push (BE-01/02/03), DNS (BE-04), certificate and domain
 * expiry (BE-05), gRPC health (BE-09) and Kafka consumer lag (BE-10). Push monitors keep their URL
 * token as a vault reference; it is shown to the operator only when the monitor is created.
 *
 * @param maxSilenceSeconds push only: no signal for longer than this means DOWN
 * @param probe             type-specific settings of DNS, gRPC, Kafka and certificate checks
 */
public record CheckMonitorDef(
        String id,
        String name,
        String groupId,
        Type type,
        String host,
        Integer port,
        SecretRef pushToken,
        Integer maxSilenceSeconds,
        int intervalSeconds,
        long timeoutMs,
        int downAfter,
        double hysteresis,
        boolean openOnWarn,
        List<ConditionDef> conditions,
        List<FieldDef> fields,
        boolean paused,
        Instant updatedAt,
        String updatedBy,
        Probe probe,
        WindowDef window,
        RetryDef retry) implements MonitorDef {

    public enum Type { TCP, PING, PUSH, DNS, GRPC, KAFKA, CERT }

    /**
     * Settings of the newer check types; only the fields of the monitor's type are used.
     *
     * @param recordType       DNS: A, AAAA, CNAME, MX, TXT or NS
     * @param expected         DNS: value that must be among the answers (null accepts any answer)
     * @param service          gRPC: service name for grpc.health.v1 (empty = whole server)
     * @param tls              gRPC: use TLS
     * @param bootstrapServers Kafka: {@code host:port} list, comma separated
     * @param consumerGroup    Kafka: consumer group whose lag is measured
     * @param topic            Kafka: topic
     * @param domain           certificate: registrable domain whose expiry is read over RDAP (optional)
     */
    public record Probe(String recordType, String expected, String service, Boolean tls, String bootstrapServers,
                        String consumerGroup, String topic, String domain) {

        public static Probe dns(String recordType, String expected) {
            return new Probe(recordType, expected, null, null, null, null, null, null);
        }

        public static Probe grpc(String service, boolean tls) {
            return new Probe(null, null, service, tls, null, null, null, null);
        }

        public static Probe kafka(String bootstrapServers, String consumerGroup, String topic) {
            return new Probe(null, null, null, null, bootstrapServers, consumerGroup, topic, null);
        }

        public static Probe cert(String domain) {
            return new Probe(null, null, null, null, null, null, null, domain);
        }

        public boolean useTls() {
            return Boolean.TRUE.equals(tls);
        }
    }

    public CheckMonitorDef {
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
        fields = fields == null ? List.of() : List.copyOf(fields);
    }

    /** TCP, ping and push monitors (no type-specific settings, window or retry). */
    public CheckMonitorDef(String id, String name, String groupId, Type type, String host, Integer port,
                           SecretRef pushToken, Integer maxSilenceSeconds, int intervalSeconds, long timeoutMs,
                           int downAfter, double hysteresis, boolean openOnWarn, List<ConditionDef> conditions,
                           List<FieldDef> fields, boolean paused, Instant updatedAt, String updatedBy) {
        this(id, name, groupId, type, host, port, pushToken, maxSilenceSeconds, intervalSeconds, timeoutMs, downAfter,
                hysteresis, openOnWarn, conditions, fields, paused, updatedAt, updatedBy, null, null, null);
    }

    /** Never null, so callers can read type settings without a null check. */
    @Override
    public Probe probe() {
        return probe == null ? new Probe(null, null, null, null, null, null, null, null) : probe;
    }

    @Override
    public MonitorKind kind() {
        return MonitorKind.valueOf(type.name());
    }

    public CheckMonitorDef withPushToken(SecretRef token) {
        return new CheckMonitorDef(id, name, groupId, type, host, port, token, maxSilenceSeconds, intervalSeconds,
                timeoutMs, downAfter, hysteresis, openOnWarn, conditions, fields, paused, updatedAt, updatedBy, probe,
                window, retry);
    }

    CheckMonitorDef touchedBy(String operator, Instant at) {
        return new CheckMonitorDef(id, name, groupId, type, host, port, pushToken, maxSilenceSeconds, intervalSeconds,
                timeoutMs, downAfter, hysteresis, openOnWarn, conditions, fields, paused, at, operator, probe, window,
                retry);
    }

    @Override
    public String toString() {
        return "CheckMonitorDef[" + id + ", " + type + ", " + host + (port == null ? "" : ":" + port) + "]";
    }
}
