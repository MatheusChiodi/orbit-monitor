package io.orbit.probe.http;

import java.net.URI;
import java.time.Duration;
import java.util.Map;

/** Pedido de checagem HTTP; segredos já vêm resolvidos do cofre nos headers. */
public record HttpProbeRequest(
        String method,
        URI uri,
        Map<String, String> headers,
        String body,
        Duration timeout,
        boolean followRedirects) {

    public HttpProbeRequest {
        headers = headers == null ? Map.of() : Map.copyOf(headers);
    }
}
