package io.orbit.monitor.http;

import java.util.List;
import java.util.Map;

/**
 * HTTP response collected by the probe, in the shape conditions see.
 *
 * @param certDaysLeft days until the TLS certificate expires; null without TLS
 */
public record HttpResponseSnapshot(
        int status,
        long responseTimeMs,
        String body,
        Map<String, List<String>> headers,
        Integer certDaysLeft) {

    public HttpResponseSnapshot {
        headers = Map.copyOf(headers);
    }
}
