package io.orbit.probe.oauth;

import com.sun.net.httpserver.HttpServer;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.SsrfGuard;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-08 OAuth2 token endpoint over HTTP (client credentials grant)")
class HttpTokenEndpointTest {

    private HttpServer server;
    private String base;
    private final AtomicReference<String> authorization = new AtomicReference<>();
    private final AtomicReference<String> form = new AtomicReference<>();

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/token", ex -> {
            authorization.set(ex.getRequestHeaders().getFirst("Authorization"));
            form.set(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = "{\"access_token\":\"tok-123\",\"token_type\":\"Bearer\",\"expires_in\":3600}"
                    .getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(200, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        server.createContext("/denied", ex -> {
            byte[] body = "{\"error\":\"invalid_client\",\"secret\":\"s3cr3t\"}".getBytes(StandardCharsets.UTF_8);
            ex.sendResponseHeaders(401, body.length);
            ex.getResponseBody().write(body);
            ex.close();
        });
        server.start();
        base = "http://localhost:" + server.getAddress().getPort();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private HttpTokenEndpoint endpoint() {
        return new HttpTokenEndpoint(new HttpProbe(new SsrfGuard(h -> List.of(InetAddress.getLoopbackAddress()),
                Set.of())), Duration.ofSeconds(5));
    }

    @Test
    @DisplayName("posts grant_type=client_credentials with HTTP Basic client authentication and reads the token")
    void requestsToken() {
        OAuth2TokenProvider.Token token = endpoint().request(
                new OAuth2TokenProvider.Credentials(base + "/token", "orbit app", "p@ss:word", "read write"));

        assertThat(token.accessToken()).isEqualTo("tok-123");
        assertThat(token.expiresIn()).isEqualTo(Duration.ofHours(1));
        String expected = Base64.getEncoder().encodeToString("orbit+app:p%40ss%3Aword".getBytes(StandardCharsets.UTF_8));
        assertThat(authorization.get()).isEqualTo("Basic " + expected);
        assertThat(form.get()).isEqualTo("grant_type=client_credentials&scope=read+write");
    }

    @Test
    @DisplayName("an error answer names the status and the OAuth error code, never the body or the secret")
    void rejected() {
        assertThatThrownBy(() -> endpoint().request(
                new OAuth2TokenProvider.Credentials(base + "/denied", "orbit", "s3cr3t", null)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("401").hasMessageContaining("invalid_client")
                .hasMessageNotContaining("s3cr3t");
    }
}
