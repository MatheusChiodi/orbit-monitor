package io.orbit.probe.http;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SsrfGuardTest {

    /** Resolves fake names to fixed IPs, without real DNS. */
    private static HostResolver fakeDns(Map<String, String> table) {
        return host -> {
            String ip = table.get(host);
            if (ip == null) {
                throw new UnknownHostException(host);
            }
            return List.of(InetAddress.getByName(ip));
        };
    }

    private final HostResolver dns = fakeDns(Map.of(
            "api.example.com", "93.184.216.34",
            "internal.corp", "10.0.0.5",
            "rebind.attacker", "169.254.169.254",
            "localhost", "127.0.0.1"));

    @Test
    void allowsPublicAddress() {
        var guard = new SsrfGuard(dns, Set.of());
        assertThatCode(() -> guard.check(URI.create("https://api.example.com/health"))).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://127.0.0.1/",
            "http://localhost:8080/",
            "http://10.1.2.3/",
            "http://172.16.0.1/",
            "http://192.168.0.10/",
            "http://169.254.169.254/latest/meta-data/",
            "http://100.64.0.1/",
            "http://0.0.0.0/",
            "http://[::1]/",
            "http://[fd00::1]/",
            "http://[fe80::1]/",
            "http://internal.corp/",
            "http://rebind.attacker/"
    })
    void blocksPrivateLoopbackAndMetadataRanges(String url) {
        var guard = new SsrfGuard(dns, Set.of());
        assertThatThrownBy(() -> guard.check(URI.create(url))).isInstanceOf(SsrfBlockedException.class);
    }

    @Test
    void blocksMetadataHostByName() {
        var guard = new SsrfGuard(fakeDns(Map.of("metadata.google.internal", "93.184.216.34")), Set.of());
        assertThatThrownBy(() -> guard.check(URI.create("http://metadata.google.internal/")))
                .isInstanceOf(SsrfBlockedException.class);
    }

    @Test
    void blocksNonHttpSchemes() {
        var guard = new SsrfGuard(dns, Set.of());
        assertThatThrownBy(() -> guard.check(URI.create("file:///etc/passwd"))).isInstanceOf(SsrfBlockedException.class);
        assertThatThrownBy(() -> guard.check(URI.create("ftp://api.example.com/"))).isInstanceOf(SsrfBlockedException.class);
    }

    @Test
    void hostAllowlistOpensPrivateAddress() {
        var guard = new SsrfGuard(dns, Set.of("internal.corp", "localhost"));
        assertThatCode(() -> guard.check(URI.create("http://internal.corp/status"))).doesNotThrowAnyException();
        assertThatCode(() -> guard.check(URI.create("http://LOCALHOST:8080/actuator/health"))).doesNotThrowAnyException();
    }

    @Test
    void cidrAllowlistOpensRange() {
        var guard = new SsrfGuard(dns, Set.of("10.0.0.0/24"));
        assertThatCode(() -> guard.check(URI.create("http://internal.corp/"))).doesNotThrowAnyException();
        assertThatThrownBy(() -> guard.check(URI.create("http://10.1.0.1/"))).isInstanceOf(SsrfBlockedException.class);
    }

    @Test
    void unresolvableHostIsBlocked() {
        var guard = new SsrfGuard(dns, Set.of());
        assertThatThrownBy(() -> guard.check(URI.create("http://does.not.exist/")))
                .isInstanceOf(SsrfBlockedException.class)
                .hasMessageContaining("resolve");
    }

    @Test
    void cidrMatchesAddresses() throws Exception {
        assertThat(Cidr.parse("192.168.0.0/16").contains(InetAddress.getByName("192.168.10.1"))).isTrue();
        assertThat(Cidr.parse("192.168.0.0/16").contains(InetAddress.getByName("192.169.0.1"))).isFalse();
        assertThat(Cidr.parse("fc00::/7").contains(InetAddress.getByName("fd12::1"))).isTrue();
        assertThat(Cidr.parse("10.0.0.0/8").contains(InetAddress.getByName("::1"))).isFalse();
    }
}
