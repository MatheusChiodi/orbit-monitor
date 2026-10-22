package io.orbit.probe.dns;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-04 DNS probe")
class DnsProbeTest {

    private final DnsProbe probe = new DnsProbe((name, type) -> switch (type) {
        case A -> List.of("203.0.113.10", "203.0.113.11");
        case MX -> List.of("10 mail.example.com.");
        default -> throw new javax.naming.NameNotFoundException(name);
    });

    @Test
    @DisplayName("matches an expected value among the answers")
    void expectedValue() {
        DnsProbe.DnsResult r = probe.check("portal.example.com", DnsProbe.RecordType.A, "203.0.113.11");
        assertThat(r.matches()).isTrue();
        assertThat(r.values()).hasSize(2);
        assertThat(r.ms()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("an unexpected answer does not match")
    void unexpected() {
        assertThat(probe.check("portal.example.com", DnsProbe.RecordType.A, "198.51.100.1").matches()).isFalse();
    }

    @Test
    @DisplayName("any answer matches when no value is expected")
    void anyAnswer() {
        assertThat(probe.check("example.com", DnsProbe.RecordType.MX, null).matches()).isTrue();
    }

    @Test
    @DisplayName("lookup failure is reported, not thrown")
    void failure() {
        DnsProbe.DnsResult r = probe.check("missing.example.com", DnsProbe.RecordType.TXT, null);
        assertThat(r.matches()).isFalse();
        assertThat(r.error()).isNotBlank();
    }
}
