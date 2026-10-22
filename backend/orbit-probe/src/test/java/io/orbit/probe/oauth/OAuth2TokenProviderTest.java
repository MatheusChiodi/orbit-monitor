package io.orbit.probe.oauth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-08 OAuth2 client credentials")
class OAuth2TokenProviderTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final OAuth2TokenProvider.Credentials credentials =
            new OAuth2TokenProvider.Credentials("https://idp.example.com/token", "orbit", "s3cr3t", "read");

    @Test
    @DisplayName("caches the token until shortly before it expires")
    void cachesAndRefreshes() {
        AtomicInteger calls = new AtomicInteger();
        Clock[] clock = {Clock.fixed(T0, ZoneOffset.UTC)};
        Clock moving = new Clock() {
            @Override
            public ZoneId getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return clock[0].instant();
            }
        };
        OAuth2TokenProvider provider = new OAuth2TokenProvider(
                c -> new OAuth2TokenProvider.Token("tok-" + calls.incrementAndGet(), Duration.ofMinutes(10)),
                moving, Duration.ofSeconds(60));

        assertThat(provider.authorization(credentials)).isEqualTo("Bearer tok-1");
        clock[0] = Clock.fixed(T0.plus(Duration.ofMinutes(8)), ZoneOffset.UTC);
        assertThat(provider.authorization(credentials)).isEqualTo("Bearer tok-1");
        clock[0] = Clock.fixed(T0.plus(Duration.ofMinutes(9).plusSeconds(1)), ZoneOffset.UTC);
        assertThat(provider.authorization(credentials)).isEqualTo("Bearer tok-2");
        assertThat(calls).hasValue(2);
    }

    @Test
    @DisplayName("credentials never print their secret")
    void secretNotPrinted() {
        assertThat(credentials.toString()).doesNotContain("s3cr3t");
    }
}
