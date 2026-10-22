package io.orbit.api.web;

import java.util.List;
import java.util.Map;

/**
 * Body of POST /api/monitors, following the frontend {@code MonitorDefinition} contract.
 * A condition is either {@code expression} or {@code field + operator + value}. TCP and ping
 * monitors use {@code host}/{@code port}; push monitors use {@code maxSilenceSeconds}. SQL monitors may
 * send named {@code parameters} (BE-11) whose text values can reference workspace variables (BE-39).
 */
public record MonitorRequest(
        String id,
        String type,
        String name,
        String groupId,
        Integer intervalSeconds,
        Integer timeoutSeconds,
        Integer retries,
        Double hysteresis,
        Boolean openOnWarn,
        Boolean paused,
        List<ConditionRequest> conditions,
        List<FieldRequest> fields,
        String connectionId,
        String sql,
        Integer maxRows,
        String method,
        String url,
        Map<String, String> headers,
        String body,
        Boolean followRedirects,
        String host,
        Integer port,
        Integer maxSilenceSeconds,
        Map<String, Object> parameters) {

    public record ConditionRequest(String field, String operator, String value, String expression, String level) {
    }

    public record FieldRequest(String field, Boolean selected, String label, String format, String unit,
                               Integer decimals, Boolean storeAsSeries, String display) {
    }

    /** Body of POST /api/monitors/preview: a SQL or HTTP target that is not stored. */
    public record PreviewRequest(String type, String connectionId, String sql, String method, String url,
                                 Map<String, String> headers, String body) {
    }

    /** Body of POST /api/conditions/validate. */
    public record ConditionCheck(String expression, String level) {
    }
}
