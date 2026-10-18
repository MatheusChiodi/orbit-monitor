package io.orbit.security.access;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetAddress;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccessPolicyTest {

    private static InetAddress ip(String text) throws Exception {
        return InetAddress.getByName(text);
    }

    @ParameterizedTest
    @ValueSource(strings = {"127.0.0.1", "127.0.0.2", "::1"})
    void loopbackCanMutateByDefault(String address) throws Exception {
        assertThat(AccessPolicy.loopbackOnly().canMutate(ip(address))).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"192.168.0.20", "10.1.2.3", "8.8.8.8"})
    void otherClientsAreViewOnlyByDefault(String address) throws Exception {
        assertThat(AccessPolicy.loopbackOnly().canMutate(ip(address))).isFalse();
    }

    @Test
    void lanModeAllowsPrivateNetworksButNotPublicOnes() throws Exception {
        AccessPolicy lan = new AccessPolicy(AccessMode.LAN, List.of());
        assertThat(lan.canMutate(ip("192.168.0.20"))).isTrue();
        assertThat(lan.canMutate(ip("10.1.2.3"))).isTrue();
        assertThat(lan.canMutate(ip("fd00::5"))).isTrue();
        assertThat(lan.canMutate(ip("8.8.8.8"))).isFalse();
    }

    @Test
    void cidrModeAllowsLoopbackAndTheListedRanges() throws Exception {
        AccessPolicy cidr = new AccessPolicy(AccessMode.CIDR, List.of("192.168.10.0/24"));
        assertThat(cidr.canMutate(ip("192.168.10.7"))).isTrue();
        assertThat(cidr.canMutate(ip("127.0.0.1"))).isTrue();
        assertThat(cidr.canMutate(ip("192.168.11.7"))).isFalse();
    }

    @Test
    void cidrModeNeedsRanges() {
        assertThatThrownBy(() -> new AccessPolicy(AccessMode.CIDR, List.of())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void acknowledgingIsAllowedForViewOnlyClientsWhenEnabled() throws Exception {
        AccessPolicy policy = AccessPolicy.loopbackOnly();
        assertThat(policy.decide(ip("192.168.0.20"), AccessAction.ACKNOWLEDGE)).isTrue();
        assertThat(policy.withLanAcknowledge(false).decide(ip("192.168.0.20"), AccessAction.ACKNOWLEDGE)).isFalse();
        assertThat(policy.decide(ip("192.168.0.20"), AccessAction.READ)).isTrue();
        assertThat(policy.decide(ip("192.168.0.20"), AccessAction.MUTATE)).isFalse();
    }

    @Test
    void classifiesClients() throws Exception {
        assertThat(AccessPolicy.clientKind(ip("127.0.0.1"))).isEqualTo("loopback");
        assertThat(AccessPolicy.clientKind(ip("10.0.0.7"))).isEqualTo("lan");
        assertThat(AccessPolicy.clientKind(ip("8.8.8.8"))).isEqualTo("unknown");
    }
}
