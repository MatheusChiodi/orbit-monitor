package io.orbit.probe.http;

import com.sun.net.httpserver.HttpServer;
import io.orbit.monitor.http.HttpResponseSnapshot;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HttpProbeTest {

    private HttpServer server;
    private String base;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/health", ex -> respond(ex, 200, "{\"status\":\"UP\"}", Map.of("X-Versao", "1.2")));
        server.createContext("/erro", ex -> respond(ex, 503, "fora", Map.of()));
        server.createContext("/eco", ex -> {
            String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            respond(ex, 200, ex.getRequestMethod() + ":" + ex.getRequestHeaders().getFirst("X-Token") + ":" + body, Map.of());
        });
        server.createContext("/redir-local", ex -> respond(ex, 302, "", Map.of("Location", "/health")));
        server.createContext("/redir-metadata", ex ->
                respond(ex, 302, "", Map.of("Location", "http://169.254.169.254/latest/meta-data/")));
        server.createContext("/lento", ex -> {
            try {
                Thread.sleep(1_500);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            respond(ex, 200, "ok", Map.of());
        });
        server.start();
        base = "http://localhost:" + server.getAddress().getPort();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private static void respond(com.sun.net.httpserver.HttpExchange ex, int status, String body, Map<String, String> headers)
            throws IOException {
        headers.forEach((k, v) -> ex.getResponseHeaders().add(k, v));
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.sendResponseHeaders(status, bytes.length == 0 ? -1 : bytes.length);
        if (bytes.length > 0) {
            ex.getResponseBody().write(bytes);
        }
        ex.close();
    }

    private HttpProbe probeAllowingLocalhost() {
        return new HttpProbe(new SsrfGuard(HostResolver.system(), Set.of("localhost")));
    }

    private static HttpProbeRequest get(String url) {
        return new HttpProbeRequest("GET", URI.create(url), Map.of(), null, Duration.ofSeconds(5), true);
    }

    @Test
    void coletaStatusBodyHeadersETempo() {
        HttpResponseSnapshot r = probeAllowingLocalhost().execute(get(base + "/health"));

        assertThat(r.status()).isEqualTo(200);
        assertThat(r.body()).isEqualTo("{\"status\":\"UP\"}");
        assertThat(r.headers()).containsKey("x-versao");
        assertThat(r.responseTimeMs()).isGreaterThanOrEqualTo(0);
        assertThat(r.certDaysLeft()).isNull();
    }

    @Test
    void statusDeErroNaoEhExcecao() {
        assertThat(probeAllowingLocalhost().execute(get(base + "/erro")).status()).isEqualTo(503);
    }

    @Test
    void enviaMetodoHeadersEBody() {
        var req = new HttpProbeRequest("POST", URI.create(base + "/eco"), Map.of("X-Token", "abc"), "{\"a\":1}",
                Duration.ofSeconds(5), true);
        assertThat(probeAllowingLocalhost().execute(req).body()).isEqualTo("POST:abc:{\"a\":1}");
    }

    @Test
    void segueRedirecionamentoPermitido() {
        assertThat(probeAllowingLocalhost().execute(get(base + "/redir-local")).status()).isEqualTo(200);
    }

    @Test
    void naoSegueQuandoDesligado() {
        var req = new HttpProbeRequest("GET", URI.create(base + "/redir-local"), Map.of(), null, Duration.ofSeconds(5), false);
        assertThat(probeAllowingLocalhost().execute(req).status()).isEqualTo(302);
    }

    @Test
    void redirecionamentoParaMetadataEhBloqueado() {
        assertThatThrownBy(() -> probeAllowingLocalhost().execute(get(base + "/redir-metadata")))
                .isInstanceOf(SsrfBlockedException.class);
    }

    @Test
    void semAllowlistLocalhostEhBloqueado() {
        var probe = new HttpProbe(new SsrfGuard(HostResolver.system(), Set.of()));
        assertThatThrownBy(() -> probe.execute(get(base + "/health"))).isInstanceOf(SsrfBlockedException.class);
    }

    @Test
    void estouroDeTempoViraProbeException() {
        var req = new HttpProbeRequest("GET", URI.create(base + "/lento"), Map.of(), null, Duration.ofMillis(300), true);
        assertThatThrownBy(() -> probeAllowingLocalhost().execute(req))
                .isInstanceOf(HttpProbeException.class)
                .hasMessageContaining("Tempo");
    }

    @Test
    void metodoInvalidoEhRecusado() {
        var req = new HttpProbeRequest("CONNECT", URI.create(base + "/health"), Map.of(), null, Duration.ofSeconds(1), true);
        assertThatThrownBy(() -> probeAllowingLocalhost().execute(req)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void headersSaoListas() {
        HttpResponseSnapshot r = probeAllowingLocalhost().execute(get(base + "/health"));
        assertThat(r.headers().get("x-versao")).isEqualTo(List.of("1.2"));
    }
}
