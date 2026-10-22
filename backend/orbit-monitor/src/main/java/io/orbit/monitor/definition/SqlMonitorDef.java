package io.orbit.monitor.definition;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * SQL monitor (orbit.selects.json): a validated SELECT on a registered connection.
 *
 * @param parameters BE-11: values bound to the {@code :name} placeholders of the SELECT; text values may
 *                   reference workspace variables ({@code ${var:..}}, {@code ${vault:..}}, {@code ${env:..}},
 *                   BE-39), resolved at run time
 */
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
        List<FieldDef> fields,
        boolean paused,
        Instant updatedAt,
        String updatedBy,
        Map<String, Object> parameters,
        WindowDef window,
        RetryDef retry) implements MonitorDef {

    public SqlMonitorDef {
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
        fields = fields == null ? List.of() : List.copyOf(fields);
        parameters = parameters == null ? Map.of() : Collections.unmodifiableMap(new LinkedHashMap<>(parameters));
    }

    /** SELECT without parameters, window or retry. */
    public SqlMonitorDef(String id, String name, String groupId, String connectionId, String sql, int intervalSeconds,
                         long timeoutMs, int maxRows, int downAfter, double hysteresis, boolean openOnWarn,
                         List<ConditionDef> conditions, List<FieldDef> fields, boolean paused, Instant updatedAt,
                         String updatedBy) {
        this(id, name, groupId, connectionId, sql, intervalSeconds, timeoutMs, maxRows, downAfter, hysteresis,
                openOnWarn, conditions, fields, paused, updatedAt, updatedBy, null, null, null);
    }

    /** A SELECT with parameters, without window or retry. */
    public SqlMonitorDef(String id, String name, String groupId, String connectionId, String sql, int intervalSeconds,
                         long timeoutMs, int maxRows, int downAfter, double hysteresis, boolean openOnWarn,
                         List<ConditionDef> conditions, List<FieldDef> fields, boolean paused, Instant updatedAt,
                         String updatedBy, Map<String, Object> parameters) {
        this(id, name, groupId, connectionId, sql, intervalSeconds, timeoutMs, maxRows, downAfter, hysteresis,
                openOnWarn, conditions, fields, paused, updatedAt, updatedBy, parameters, null, null);
    }

    @Override
    public MonitorKind kind() {
        return MonitorKind.SQL;
    }

    SqlMonitorDef touchedBy(String operator, Instant at) {
        return new SqlMonitorDef(id, name, groupId, connectionId, sql, intervalSeconds, timeoutMs, maxRows, downAfter,
                hysteresis, openOnWarn, conditions, fields, paused, at, operator, parameters, window, retry);
    }
}
