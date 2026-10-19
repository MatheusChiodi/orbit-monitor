package io.orbit.alerting.suppression;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-29 deduplication")
class AlertDeduplicatorTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final AlertDeduplicator dedup = new AlertDeduplicator(Duration.ofMinutes(5));

    @Test
    @DisplayName("equal alerts inside five minutes are sent once and counted")
    void groups() {
        assertThat(dedup.shouldSend("m|DOWN|chn_team", T0)).isTrue();
        assertThat(dedup.shouldSend("m|DOWN|chn_team", T0.plusSeconds(60))).isFalse();
        assertThat(dedup.shouldSend("m|DOWN|chn_team", T0.plusSeconds(200))).isFalse();
        assertThat(dedup.grouped("m|DOWN|chn_team")).isEqualTo(3);
        assertThat(dedup.shouldSend("m|WARN|chn_team", T0.plusSeconds(60))).isTrue();
    }

    @Test
    @DisplayName("after the window the next alert is sent again")
    void windowEnds() {
        dedup.shouldSend("k", T0);
        assertThat(dedup.shouldSend("k", T0.plus(Duration.ofMinutes(5)).plusSeconds(1))).isTrue();
    }
}
