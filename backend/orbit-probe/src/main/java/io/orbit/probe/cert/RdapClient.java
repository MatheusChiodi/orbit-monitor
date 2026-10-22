package io.orbit.probe.cert;

import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.http.SsrfBlockedException;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * BE-05: domain expiry over RDAP (RFC 9083), the JSON successor of WHOIS. The default base URL is
 * the rdap.org bootstrap redirector, which forwards to the registry of the TLD; every hop goes through
 * the HttpProbe and so through the SSRF guard. Answers are cached (expiry dates change rarely and
 * registries rate-limit).
 */
public class RdapClient {

    public static final String DEFAULT_BASE = "https://rdap.org/domain/";

    /** @param error why no date is known; null when {@code expiresAt} is set */
    public record DomainExpiry(Instant expiresAt, String error) {
    }

    private record Cached(DomainExpiry value, Instant until) {
    }

    private final HttpProbe http;
    private final String base;
    private final Clock clock;
    private final Duration ttl;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public RdapClient(HttpProbe http, String base, Clock clock, Duration ttl) {
        this.http = http;
        this.base = base.endsWith("/") ? base : base + "/";
        this.clock = clock;
        this.ttl = ttl;
    }

    public DomainExpiry expiry(String domain, Duration timeout) {
        String key = domain.strip().toLowerCase(Locale.ROOT);
        Cached cached = cache.get(key);
        Instant now = clock.instant();
        if (cached != null && now.isBefore(cached.until())) {
            return cached.value();
        }
        DomainExpiry value = fetch(key, timeout);
        // Failures are cached briefly so an outage does not hammer the registry.
        Duration keep = value.expiresAt() == null ? Duration.ofMinutes(5) : ttl;
        cache.put(key, new Cached(value, now.plus(keep)));
        return value;
    }

    private DomainExpiry fetch(String domain, Duration timeout) {
        try {
            HttpResponseSnapshot response = http.execute(new HttpProbeRequest("GET", URI.create(base + domain),
                    Map.of("Accept", "application/rdap+json"), null, timeout, true));
            if (response.status() != 200) {
                return new DomainExpiry(null, "RDAP answered HTTP " + response.status() + " for " + domain);
            }
            return ExpiryPolicy.domainExpiry(response.body()).map(at -> new DomainExpiry(at, null))
                    .orElseGet(() -> new DomainExpiry(null, "RDAP has no expiration date for " + domain));
        } catch (HttpProbeException | SsrfBlockedException | IllegalArgumentException e) {
            return new DomainExpiry(null, "RDAP lookup failed: " + e.getMessage());
        }
    }
}
