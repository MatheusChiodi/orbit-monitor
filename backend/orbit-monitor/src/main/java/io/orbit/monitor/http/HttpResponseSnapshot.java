package io.orbit.monitor.http;

import java.util.List;
import java.util.Map;

/**
 * Resposta HTTP já coletada pelo probe, no formato que as condições enxergam.
 *
 * @param certDaysLeft dias até o certificado TLS vencer; nulo quando não há TLS
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
