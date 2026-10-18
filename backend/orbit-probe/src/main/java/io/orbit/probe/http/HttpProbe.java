package io.orbit.probe.http;

import io.orbit.monitor.http.HttpResponseSnapshot;

import javax.net.ssl.SSLPeerUnverifiedException;
import javax.net.ssl.SSLSession;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Runs HTTP checks. Redirects are followed manually so that every hop
 * goes through the {@link SsrfGuard} again.
 */
public class HttpProbe {

    private static final int MAX_REDIRECTS = 5;
    private static final Set<String> METHODS = Set.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    private static final Set<Integer> REDIRECTS = Set.of(301, 302, 303, 307, 308);

    private final SsrfGuard guard;
    private final HttpClient client;

    public HttpProbe(SsrfGuard guard) {
        this(guard, HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(10))
                .build());
    }

    public HttpProbe(SsrfGuard guard, HttpClient client) {
        this.guard = guard;
        this.client = client;
    }

    public HttpResponseSnapshot execute(HttpProbeRequest request) {
        String method = request.method().toUpperCase(Locale.ROOT);
        if (!METHODS.contains(method)) {
            throw new IllegalArgumentException("Unsupported HTTP method: " + request.method());
        }
        long start = System.nanoTime();
        URI uri = request.uri();
        HttpResponse<String> response = send(method, uri, request);
        int hops = 0;
        while (request.followRedirects() && REDIRECTS.contains(response.statusCode()) && hops++ < MAX_REDIRECTS) {
            Optional<String> location = response.headers().firstValue("location");
            if (location.isEmpty()) {
                break;
            }
            uri = uri.resolve(location.get());
            boolean keepMethod = response.statusCode() == 307 || response.statusCode() == 308;
            response = send(keepMethod ? method : "GET", uri, keepMethod ? request : withoutBody(request));
        }
        long elapsedMs = Duration.ofNanos(System.nanoTime() - start).toMillis();
        return new HttpResponseSnapshot(response.statusCode(), elapsedMs, response.body(),
                lowerCaseHeaders(response), certDaysLeft(response));
    }

    private HttpResponse<String> send(String method, URI uri, HttpProbeRequest request) {
        guard.check(uri);
        HttpRequest.BodyPublisher body = request.body() == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(request.body());
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri).timeout(request.timeout()).method(method, body);
        request.headers().forEach(builder::header);
        try {
            return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException e) {
            throw new HttpProbeException("Timed out after " + request.timeout().toMillis() + " ms", e);
        } catch (IOException e) {
            throw new HttpProbeException("Connection failed: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new HttpProbeException("Check interrupted", e);
        }
    }

    private static HttpProbeRequest withoutBody(HttpProbeRequest r) {
        return new HttpProbeRequest("GET", r.uri(), r.headers(), null, r.timeout(), r.followRedirects());
    }

    private static Map<String, List<String>> lowerCaseHeaders(HttpResponse<?> response) {
        Map<String, List<String>> headers = new LinkedHashMap<>();
        response.headers().map().forEach((k, v) -> headers.put(k.toLowerCase(Locale.ROOT), List.copyOf(v)));
        return headers;
    }

    private static Integer certDaysLeft(HttpResponse<?> response) {
        Optional<SSLSession> session = response.sslSession();
        if (session.isEmpty()) {
            return null;
        }
        try {
            Certificate[] chain = session.get().getPeerCertificates();
            if (chain.length > 0 && chain[0] instanceof X509Certificate x509) {
                return (int) Duration.between(Instant.now(), x509.getNotAfter().toInstant()).toDays();
            }
        } catch (SSLPeerUnverifiedException e) {
            return null;
        }
        return null;
    }
}
