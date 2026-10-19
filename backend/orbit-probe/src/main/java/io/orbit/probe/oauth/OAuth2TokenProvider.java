package io.orbit.probe.oauth;

import java.time.Clock;
import java.time.Duration;

/** BE-08: OAuth2 client credentials; the token is cached and refreshed before it expires. */
public class OAuth2TokenProvider {

    public record Credentials(String tokenUrl, String clientId, String clientSecret, String scope) {
        @Override
        public String toString() {
            return "Credentials[" + tokenUrl + ", " + clientId + ", ••••]";
        }
    }

    public record Token(String accessToken, Duration expiresIn) {
    }

    /** Token endpoint port (HTTP POST grant_type=client_credentials). */
    @FunctionalInterface
    public interface TokenEndpoint {
        Token request(Credentials credentials);
    }

    /** @param refreshMargin how long before expiry a new token is requested */
    public OAuth2TokenProvider(TokenEndpoint endpoint, Clock clock, Duration refreshMargin) {
    }

    /** Value for the Authorization header ({@code Bearer ...}). */
    public String authorization(Credentials credentials) {
        throw new UnsupportedOperationException("BE-08 OAuth2 client credentials is not implemented yet");
    }
}
