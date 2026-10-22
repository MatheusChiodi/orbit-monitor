package io.orbit.monitor.definition;

import io.orbit.security.vault.SecretRef;

import java.time.Instant;
import java.util.List;

/**
 * TCP, ping and push monitors (orbit.checks.json). Push monitors keep their URL token as a vault
 * reference; it is shown to the operator only when the monitor is created.
 *
 * @param maxSilenceSeconds push only: no signal for longer than this means DOWN
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
        String updatedBy) implements MonitorDef {

    public enum Type { TCP, PING, PUSH }

    public CheckMonitorDef {
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
        fields = fields == null ? List.of() : List.copyOf(fields);
    }

    @Override
    public MonitorKind kind() {
        return switch (type) {
            case TCP -> MonitorKind.TCP;
            case PING -> MonitorKind.PING;
            case PUSH -> MonitorKind.PUSH;
        };
    }

    public CheckMonitorDef withPushToken(SecretRef token) {
        return new CheckMonitorDef(id, name, groupId, type, host, port, token, maxSilenceSeconds, intervalSeconds,
                timeoutMs, downAfter, hysteresis, openOnWarn, conditions, fields, paused, updatedAt, updatedBy);
    }

    CheckMonitorDef touchedBy(String operator, Instant at) {
        return new CheckMonitorDef(id, name, groupId, type, host, port, pushToken, maxSilenceSeconds, intervalSeconds,
                timeoutMs, downAfter, hysteresis, openOnWarn, conditions, fields, paused, at, operator);
    }

    @Override
    public String toString() {
        return "CheckMonitorDef[" + id + ", " + type + ", " + host + (port == null ? "" : ":" + port) + "]";
    }
}
