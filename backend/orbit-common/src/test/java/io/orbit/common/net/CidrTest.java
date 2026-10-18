package io.orbit.common.net;

import org.junit.jupiter.api.Test;

import java.net.InetAddress;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CidrTest {

    @Test
    void matchesAddresses() throws Exception {
        assertThat(Cidr.parse("192.168.0.0/16").contains(InetAddress.getByName("192.168.10.1"))).isTrue();
        assertThat(Cidr.parse("192.168.0.0/16").contains(InetAddress.getByName("192.169.0.1"))).isFalse();
        assertThat(Cidr.parse("fc00::/7").contains(InetAddress.getByName("fd12::1"))).isTrue();
        assertThat(Cidr.parse("10.0.0.0/8").contains(InetAddress.getByName("::1"))).isFalse();
    }

    @Test
    void rejectsMalformedRanges() {
        assertThatThrownBy(() -> Cidr.parse("10.0.0.0")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Cidr.parse("10.0.0.0/33")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Cidr.parse("10.0.0.0/x")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void zeroPrefixMatchesEverythingOfTheSameFamily() throws Exception {
        assertThat(Cidr.parse("0.0.0.0/0").contains(InetAddress.getByName("8.8.8.8"))).isTrue();
    }
}
