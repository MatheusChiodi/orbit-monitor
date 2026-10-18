package io.orbit.monitor.definition;

import io.orbit.security.vault.SecretRef;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * HTTP monitor (orbit.requests.json). Plain headers are stored as typed; headers carrying
 * credentials ({@code Authorization}, API keys) go to {@code secretHeaders} as vault references.
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
        boolean paused,
        Instant updatedAt,
        String updatedBy) implements MonitorDef {

    public HttpMonitorDef {
        headers = headers == null ? Map.of() : Map.copyOf(headers);
        secretHeaders = secretHeaders == null ? Map.of() : Map.copyOf(secretHeaders);
        conditions = conditions == null ? List.of() : List.copyOf(conditions);
    }

    @Override
    public MonitorKind kind() {
        return MonitorKind.HTTP;
    }

    HttpMonitorDef touchedBy(String operator, Instant at) {
        return new HttpMonitorDef(id, name, groupId, method, url, headers, secretHeaders, body, intervalSeconds,
                timeoutMs, followRedirects, downAfter, hysteresis, openOnWarn, conditions, paused, at, operator);
    }
}
