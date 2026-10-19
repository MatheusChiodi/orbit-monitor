package io.orbit.probe.dns;

import java.util.List;

/** BE-04: DNS check by record type, with expected value and resolution time. */
public class DnsProbe {

    public enum RecordType { A, AAAA, CNAME, MX, TXT, NS }

    /** Resolver port (JNDI DNS in production, fake in tests). */
    @FunctionalInterface
    public interface DnsResolver {
        List<String> lookup(String name, RecordType type) throws Exception;
    }

    /** @param error null when the lookup answered */
    public record DnsResult(List<String> values, long ms, boolean matches, String error) {
    }

    public DnsProbe(DnsResolver resolver) {
    }

    /** @param expected value that must be among the answers; null accepts any answer */
    public DnsResult check(String name, RecordType type, String expected) {
        throw new UnsupportedOperationException("BE-04 DNS probe is not implemented yet");
    }
}
