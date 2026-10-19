package io.orbit.alerting.channel;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-36 channel reliability")
class ReliableSenderTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-18T12:00:00Z"), ZoneOffset.UTC);
    private final List<Duration> slept = new ArrayList<>();

    @Test
    @DisplayName("retries with backoff and succeeds")
    void retries() {
        AtomicInteger calls = new AtomicInteger();
        ReliableSender sender = new ReliableSender((c, p) -> {
            if (calls.incrementAndGet() < 3) {
                throw new IOException("503");
            }
        }, clock, 30, 3, Duration.ofSeconds(1), slept::add);

        assertThat(sender.send("chn_team", "{}")).isEqualTo(ReliableSender.Outcome.SENT);
        assertThat(slept).containsExactly(Duration.ofSeconds(1), Duration.ofSeconds(2));
    }

    @Test
    @DisplayName("gives up into the dead-letter queue")
    void deadLetter() {
        ReliableSender sender = new ReliableSender((c, p) -> {
            throw new IOException("connection refused");
        }, clock, 30, 2, Duration.ofSeconds(1), slept::add);

        assertThat(sender.send("chn_team", "{\"a\":1}")).isEqualTo(ReliableSender.Outcome.DEAD_LETTER);
        assertThat(sender.deadLetters()).singleElement().satisfies(d -> {
            assertThat(d.channelId()).isEqualTo("chn_team");
            assertThat(d.attempts()).isEqualTo(2);
            assertThat(d.error()).contains("refused");
        });
    }

    @Test
    @DisplayName("rate limit per channel per minute")
    void rateLimit() {
        ReliableSender sender = new ReliableSender((c, p) -> { }, clock, 2, 1, Duration.ofSeconds(1), slept::add);
        assertThat(sender.send("chn_team", "1")).isEqualTo(ReliableSender.Outcome.SENT);
        assertThat(sender.send("chn_team", "2")).isEqualTo(ReliableSender.Outcome.SENT);
        assertThat(sender.send("chn_team", "3")).isEqualTo(ReliableSender.Outcome.RATE_LIMITED);
        assertThat(sender.send("chn_other", "1")).isEqualTo(ReliableSender.Outcome.SENT);
    }
}
