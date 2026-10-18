package io.orbit.probe.http;

import java.net.URI;
import java.time.Duration;
import java.util.Map;

/** HTTP check request; secrets arrive already resolved from the vault into the headers. */
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
