package io.orbit.probe.oauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeRequest;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

/**
 * BE-08 token endpoint: {@code POST grant_type=client_credentials} (RFC 6749 section 4.4) with the
 * client authenticated by HTTP Basic (section 2.3.1, id and secret form-encoded first). The request
 * goes through the HttpProbe, so the token URL passes the SSRF guard. Errors carry the status and the
 * OAuth {@code error} code only, never the response body.
 */
public class HttpTokenEndpoint implements OAuth2TokenProvider.TokenEndpoint {

    private static final ObjectMapper JSON = new ObjectMapper();
    private final HttpProbe http;
    private final Duration timeout;

    public HttpTokenEndpoint(HttpProbe http, Duration timeout) {
        this.http = http;
        this.timeout = timeout;
    }

    @Override
    public OAuth2TokenProvider.Token request(OAuth2TokenProvider.Credentials credentials) {
        String basic = Base64.getEncoder().encodeToString((encode(credentials.clientId()) + ":"
                + encode(credentials.clientSecret())).getBytes(StandardCharsets.UTF_8));
        String form = "grant_type=client_credentials" + (credentials.scope() == null || credentials.scope().isBlank()
                ? "" : "&scope=" + encode(credentials.scope()));
        HttpResponseSnapshot response = http.execute(new HttpProbeRequest("POST", URI.create(credentials.tokenUrl()),
                Map.of("Authorization", "Basic " + basic, "Content-Type", "application/x-www-form-urlencoded",
                        "Accept", "application/json"), form, timeout, false));
        JsonNode body = parse(response.body());
        if (response.status() != 200) {
            String code = body.path("error").asText("");
            throw new IllegalStateException("Token endpoint answered HTTP " + response.status()
                    + (code.matches("[a-z_]{1,40}") ? " (" + code + ")" : ""));
        }
        String token = body.path("access_token").asText(null);
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Token endpoint returned no access_token");
        }
        long expiresIn = body.path("expires_in").asLong(0);
        return new OAuth2TokenProvider.Token(token, Duration.ofSeconds(Math.max(0, expiresIn)));
    }

    private static JsonNode parse(String body) {
        try {
            return body == null || body.isBlank() ? JSON.createObjectNode() : JSON.readTree(body);
        } catch (IOException e) {
            return JSON.createObjectNode();
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
