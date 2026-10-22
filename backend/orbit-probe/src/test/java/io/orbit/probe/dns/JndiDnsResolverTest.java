package io.orbit.probe.dns;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.naming.directory.BasicAttribute;
import javax.naming.directory.BasicAttributes;
import java.time.Duration;
import java.util.Hashtable;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BE-04 JNDI DNS resolver (JDK built-in)")
class JndiDnsResolverTest {

    @Test
    @DisplayName("reads every value of the requested record type, MX keeps its preference")
    void readsValues() throws Exception {
        BasicAttributes attributes = new BasicAttributes(true);
        BasicAttribute mx = new BasicAttribute("MX");
        mx.add("10 mail1.example.com.");
        mx.add("20 mail2.example.com.");
        attributes.put(mx);

        assertThat(JndiDnsResolver.values(attributes, DnsProbe.RecordType.MX))
                .containsExactly("10 mail1.example.com.", "20 mail2.example.com.");
        assertThat(JndiDnsResolver.values(attributes, DnsProbe.RecordType.A)).isEmpty();
    }

    @Test
    @DisplayName("TXT values lose their surrounding quotes")
    void unquotesTxt() throws Exception {
        BasicAttributes attributes = new BasicAttributes(true);
        attributes.put(new BasicAttribute("TXT", "\"v=spf1 -all\""));
        assertThat(JndiDnsResolver.values(attributes, DnsProbe.RecordType.TXT)).containsExactly("v=spf1 -all");
    }

    @Test
    @DisplayName("the JNDI environment uses the DNS provider, the system resolvers and the timeout")
    void environment() {
        Hashtable<String, String> env = JndiDnsResolver.environment(null, Duration.ofSeconds(3));
        assertThat(env).containsEntry("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory")
                .containsEntry("java.naming.provider.url", "dns:")
                .containsEntry("com.sun.jndi.dns.timeout.initial", "1500")
                .containsEntry("com.sun.jndi.dns.timeout.retries", "2");
        assertThat(JndiDnsResolver.environment("1.1.1.1", Duration.ofSeconds(1)))
                .containsEntry("java.naming.provider.url", "dns://1.1.1.1");
    }
}
