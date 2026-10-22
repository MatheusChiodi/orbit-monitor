package io.orbit.api.runtime;

import io.orbit.common.privacy.DataClass;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.definition.CheckMonitorDef;
import io.orbit.monitor.definition.FieldDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.SqlMonitorDef;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.probe.CheckResult;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Which numbers of a check are kept as series in the history (fields with "store as series"):
 * BE-23 JSONPath values of HTTP bodies, SQL columns of the first row, and the measured numbers of
 * the checks (Kafka lag, days left). CORE-16: card fields are never a series, whatever the config says.
 */
final class SeriesMetrics {

    private static final SensitiveDataRedactor REDACTOR = new SensitiveDataRedactor();

    private SeriesMetrics() {
    }

    /** JSONPaths of the HTTP fields stored as series. */
    static List<String> jsonPaths(HttpMonitorDef http) {
        return http.fields().stream().filter(FieldDef::series).map(FieldDef::key).filter(k -> k.startsWith("$"))
                .toList();
    }

    static CheckResult keep(MonitorDef def, CheckResult result) {
        Map<String, Double> kept = new LinkedHashMap<>();
        switch (def) {
            case SqlMonitorDef sql -> sqlColumns(sql, result.payload(), kept);
            case CheckMonitorDef check -> kept.putAll(result.metrics());
            default -> kept.putAll(result.metrics());
        }
        kept.keySet().removeIf(SeriesMetrics::isCardField);
        return kept.equals(result.metrics()) ? result : result.withMetrics(kept);
    }

    private static void sqlColumns(SqlMonitorDef sql, Object payload, Map<String, Double> kept) {
        if (!(payload instanceof ResultPayload rows) || rows.rows().isEmpty()) {
            return;
        }
        List<ResultColumn> columns = rows.columns();
        List<Object> first = rows.rows().getFirst();
        for (FieldDef field : sql.fields()) {
            if (!field.series()) {
                continue;
            }
            for (int i = 0; i < columns.size(); i++) {
                if (columns.get(i).name().equalsIgnoreCase(field.key()) && first.get(i) instanceof Number n
                        && Double.isFinite(n.doubleValue())) {
                    kept.put(field.key(), n.doubleValue());
                }
            }
        }
    }

    private static boolean isCardField(String key) {
        String leaf = key.replaceAll("^.*[.\\[']", "").replace("]", "").replace("'", "");
        DataClass dataClass = REDACTOR.classifyName(leaf.toLowerCase(Locale.ROOT));
        return dataClass == DataClass.PCI_PAN || dataClass == DataClass.PCI_SAD;
    }
}
