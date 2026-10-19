package io.orbit.probe.cert;

import io.orbit.common.MonitorState;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("pending")
@DisplayName("BE-05 certificate and domain expiry")
class ExpiryPolicyTest {

    @ParameterizedTest
    @CsvSource({"90, OK", "31, OK", "30, WARN", "8, WARN", "7, DOWN", "0, DOWN", "-3, DOWN"})
    @DisplayName("state by days left")
    void states(long days, MonitorState expected) {
        assertThat(ExpiryPolicy.stateFor(days)).isEqualTo(expected);
    }

    @Test
    @DisplayName("warning steps are 30, 14 and 7 days")
    void steps() {
        assertThat(ExpiryPolicy.warningStep(30)).contains(30);
        assertThat(ExpiryPolicy.warningStep(20)).contains(30);
        assertThat(ExpiryPolicy.warningStep(14)).contains(14);
        assertThat(ExpiryPolicy.warningStep(5)).contains(7);
        assertThat(ExpiryPolicy.warningStep(45)).isEmpty();
    }

    @Test
    @DisplayName("reads the expiration event from RDAP")
    void rdap() {
        String json = """
                {"events":[{"eventAction":"registration","eventDate":"2010-01-01T00:00:00Z"},
                           {"eventAction":"expiration","eventDate":"2027-03-15T12:00:00Z"}]}
                """;
        assertThat(ExpiryPolicy.domainExpiry(json)).contains(Instant.parse("2027-03-15T12:00:00Z"));
        assertThat(ExpiryPolicy.domainExpiry("{\"events\":[]}")).isEmpty();
        assertThat(ExpiryPolicy.domainExpiry("not json")).isEmpty();
    }
}
