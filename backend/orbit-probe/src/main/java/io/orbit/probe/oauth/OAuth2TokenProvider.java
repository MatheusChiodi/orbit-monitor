package io.orbit.probe.oauth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/** BE-08: OAuth2 client credentials; the token is cached and refreshed before it expires. */
public class OAuth2TokenProvider {

    public record Credentials(String tokenUrl, String clientId, String clientSecret, String scope) {
        @Override
        public String toString() {
            return "Credentials[" + tokenUrl + ", " + clientId + ", ••••]";
        }
    }

    public record Token(String accessToken, Duration expiresIn) {
        @Override
        public String toString() {
            return "Token[••••, " + expiresIn + "]";
        }
    }

    /** Token endpoint port (HTTP POST grant_type=client_credentials). */
    @FunctionalInterface
    public interface TokenEndpoint {
        Token request(Credentials credentials);
    }

    /** Cache key: never holds the client secret, so a rotated secret reuses the slot. */
    private record Key(String tokenUrl, String clientId, String scope) {
    }

    private record Cached(String accessToken, Instant refreshAt) {
    }

    private final TokenEndpoint endpoint;
    private final Clock clock;
    private final Duration refreshMargin;
    private final Map<Key, Cached> cache = new ConcurrentHashMap<>();

    /** @param refreshMargin how long before expiry a new token is requested */
    public OAuth2TokenProvider(TokenEndpoint endpoint, Clock clock, Duration refreshMargin) {
        this.endpoint = Objects.requireNonNull(endpoint, "endpoint");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.refreshMargin = refreshMargin == null || refreshMargin.isNegative() ? Duration.ZERO : refreshMargin;
    }

    /** Value for the Authorization header ({@code Bearer ...}). */
    public String authorization(Credentials credentials) {
        Key key = new Key(credentials.tokenUrl(), credentials.clientId(), credentials.scope());
        Cached cached = cache.compute(key, (k, current) -> {
            Instant now = clock.instant();
            if (current != null && now.isBefore(current.refreshAt())) {
                return current;
            }
            return fetch(credentials, now);
        });
        return "Bearer " + cached.accessToken();
    }

    /** Drops the cached token, e.g. after the API answered 401. */
    public void invalidate(Credentials credentials) {
        cache.remove(new Key(credentials.tokenUrl(), credentials.clientId(), credentials.scope()));
    }

    private Cached fetch(Credentials credentials, Instant now) {
        Token token = endpoint.request(credentials);
        if (token == null || token.accessToken() == null || token.accessToken().isBlank()) {
            throw new IllegalStateException("Token endpoint returned no access token for client " + credentials.clientId());
        }
        Duration lifetime = token.expiresIn() == null ? Duration.ZERO : token.expiresIn();
        // A lifetime shorter than the margin is still used once instead of refreshing on every call.
        Duration usable = lifetime.compareTo(refreshMargin) > 0 ? lifetime.minus(refreshMargin) : lifetime;
        return new Cached(token.accessToken(), now.plus(usable));
    }
}
