package io.orbit.probe.dns;

import java.time.Duration;
import java.util.List;
import java.util.Locale;

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

    private final DnsResolver resolver;

    public DnsProbe(DnsResolver resolver) {
        this.resolver = resolver;
    }

    /** @param expected value that must be among the answers; null accepts any answer */
    public DnsResult check(String name, RecordType type, String expected) {
        long start = System.nanoTime();
        try {
            List<String> values = List.copyOf(resolver.lookup(name, type));
            boolean matches = expected == null || expected.isBlank()
                    ? !values.isEmpty()
                    : values.stream().anyMatch(v -> normalize(v).equals(normalize(expected)));
            return new DnsResult(values, elapsedMs(start), matches, null);
        } catch (Exception e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return new DnsResult(List.of(), elapsedMs(start), false, describe(e, name, type));
        }
    }

    /** DNS names are case-insensitive and may carry the trailing root dot. */
    private static String normalize(String value) {
        String v = value.trim().toLowerCase(Locale.ROOT);
        return v.endsWith(".") ? v.substring(0, v.length() - 1) : v;
    }

    private static String describe(Exception e, String name, RecordType type) {
        String detail = e.getMessage() == null || e.getMessage().isBlank() ? name : e.getMessage();
        return "DNS " + type + " lookup failed (" + e.getClass().getSimpleName() + "): " + detail;
    }

    private static long elapsedMs(long start) {
        return Duration.ofNanos(System.nanoTime() - start).toMillis();
    }
}
