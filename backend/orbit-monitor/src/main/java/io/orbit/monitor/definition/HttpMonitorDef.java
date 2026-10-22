package io.orbit.monitor.definition;

import io.orbit.security.vault.SecretRef;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * HTTP monitor (orbit.requests.json). Plain headers are stored as typed; headers carrying
 * credentials ({@code Authorization}, API keys) go to {@code secretHeaders} as vault references.
 *
 * @param steps BE-07: requests run before the main one (login); their extracted values are used as
 *              {@code ${step.variable}} in the main request's URL, headers and body
 * @param oauth BE-08: OAuth2 client credentials; the access token goes into {@code Authorization}
 */
public record HttpMonitorDef(
        String id,
        String name,
        String groupId,
        String method,
        String url,
        Map<String, String> headers,
        Map<String, SecretRef> secretHeaders,
        String body,
        int intervalSeconds,
        long timeoutMs,
        boolean followRedirects,
        int downAfter,
        double hysteresis,
        boolean openOnWarn,
        List<ConditionDef> conditions,
        List<FieldDef> fields,
        boolean paused,
        Instant updatedAt,
        String updatedBy,
        List<Step> steps,
        OAuth oauth,
        WindowDef window,
        RetryDef retry) implements MonitorDef {

    /**
     * One step of a multi-step check.
     *
     * @param extract variable name to JSONPath, e.g. {@code token -> $.access_token}
     */
    public record Step(String name, String method, String url, Map<String, String> headers, String body,
                       Map<String, String> extract) {
    }

    /** Client credentials grant; the client secret is a vault reference, never plain text. */
    public record OAuth(String tokenUrl, String clientId, SecretRef clientSecret, String scope) {
    }

    public HttpMonitorDef {
        headers = headers == null ? Map.of() : Map.copyOf(headers);
        secretHeaders = secretHeaders == null ? Map.of() : Map.copyOf(secretHeaders);
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
        fields = fields == null ? List.of() : List.copyOf(fields);
        steps = steps == null ? List.of() : List.copyOf(steps);
    }

    /** Single request, no steps, OAuth, window or retry. */
    public HttpMonitorDef(String id, String name, String groupId, String method, String url,
                          Map<String, String> headers, Map<String, SecretRef> secretHeaders, String body,
                          int intervalSeconds, long timeoutMs, boolean followRedirects, int downAfter,
                          double hysteresis, boolean openOnWarn, List<ConditionDef> conditions, List<FieldDef> fields,
                          boolean paused, Instant updatedAt, String updatedBy) {
        this(id, name, groupId, method, url, headers, secretHeaders, body, intervalSeconds, timeoutMs, followRedirects,
                downAfter, hysteresis, openOnWarn, conditions, fields, paused, updatedAt, updatedBy, null, null, null,
                null);
    }

    @Override
    public MonitorKind kind() {
        return MonitorKind.HTTP;
    }

    HttpMonitorDef touchedBy(String operator, Instant at) {
        return new HttpMonitorDef(id, name, groupId, method, url, headers, secretHeaders, body, intervalSeconds,
                timeoutMs, followRedirects, downAfter, hysteresis, openOnWarn, conditions, fields, paused, at, operator,
                steps, oauth, window, retry);
    }
}
