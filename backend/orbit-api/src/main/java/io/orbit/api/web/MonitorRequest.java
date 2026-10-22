package io.orbit.api.web;

import io.orbit.monitor.definition.CheckMonitorDef;
import io.orbit.monitor.definition.HttpMonitorDef;
import io.orbit.monitor.definition.RetryDef;
import io.orbit.monitor.definition.WindowDef;

import java.util.List;
import java.util.Map;

/**
 * Body of POST /api/monitors, following the frontend {@code MonitorDefinition} contract.
 * A condition is either {@code expression} or {@code field + operator + value}. TCP and ping
 * monitors use {@code host}/{@code port}; push monitors use {@code maxSilenceSeconds}; DNS, gRPC,
 * Kafka and certificate checks use {@code host}/{@code port} plus {@code probe}. HTTP monitors may add
 * {@code steps} (BE-07) and {@code oauth} (BE-08), SQL monitors {@code parameters} (BE-11, text
 * values may reference workspace variables, BE-39); every type
 * accepts {@code window} (BE-17) and {@code retry} (BE-18). {@code retries} is the number of failing
 * checks that confirm DOWN.
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
        CheckMonitorDef.Probe probe,
        List<HttpMonitorDef.Step> steps,
        OAuthRequest oauth,
        WindowDef window,
        RetryDef retry,
        Map<String, Object> parameters) {

    /**
     * BE-08 client credentials as typed in the console: {@code clientSecret} is sealed into the vault
     * (the masked placeholder keeps the stored one), or {@code clientSecretEnv} names an environment variable.
     */
    public record OAuthRequest(String tokenUrl, String clientId, String clientSecret, String clientSecretEnv,
                               String scope) {
    }

    public record ConditionRequest(String field, String operator, String value, String expression, String level) {
    }

    public record FieldRequest(String field, Boolean selected, String label, String format, String unit,
                               Integer decimals, Boolean storeAsSeries, String display, Boolean masked,
                               Boolean showOnWall) {
    }

    /**
     * Body of POST /api/monitors/preview: a SQL or HTTP target that is not stored. SQL may carry
     * {@code parameters} (BE-11) and the planned {@code intervalSeconds} for the cost warning (BE-14).
     */
    public record PreviewRequest(String type, String connectionId, String sql, String method, String url,
                                 Map<String, String> headers, String body, Map<String, Object> parameters,
                                 Integer intervalSeconds) {
    }

    /** Body of POST /api/conditions/validate. */
    public record ConditionCheck(String expression, String level) {
    }
}
