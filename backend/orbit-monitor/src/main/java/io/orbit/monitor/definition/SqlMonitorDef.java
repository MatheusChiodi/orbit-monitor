package io.orbit.monitor.definition;

import java.time.Instant;
import java.util.List;

/** SQL monitor (orbit.selects.json): a validated SELECT on a registered connection. */
public record SqlMonitorDef(
        String id,
        String name,
        String groupId,
        String connectionId,
        String sql,
        int intervalSeconds,
        long timeoutMs,
        int maxRows,
        int downAfter,
        double hysteresis,
        boolean openOnWarn,
        List<ConditionDef> conditions,
        boolean paused,
        Instant updatedAt,
        String updatedBy) implements MonitorDef {

    public SqlMonitorDef {
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
    }

    @Override
    public MonitorKind kind() {
        return MonitorKind.SQL;
    }

    SqlMonitorDef touchedBy(String operator, Instant at) {
        return new SqlMonitorDef(id, name, groupId, connectionId, sql, intervalSeconds, timeoutMs, maxRows, downAfter,
                hysteresis, openOnWarn, conditions, paused, at, operator);
    }
}
