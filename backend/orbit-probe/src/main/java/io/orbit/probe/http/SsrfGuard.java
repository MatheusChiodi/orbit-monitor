package io.orbit.probe.http;

import io.orbit.common.net.Cidr;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * SSRF protection for the HttpProbe. Orbit runs on the operator's machine and usually watches
 * internal systems, so private ranges and loopback are allowed by default; cloud metadata endpoints
 * (link-local 169.254.0.0/16, Alibaba 100.100.100.200, AWS IPv6 fd00:ec2::254 and known metadata
 * host names) are always blocked, even when allowlisted. With {@code blockPrivate} on
 * ({@code orbit.http.block-private=true}) loopback, RFC 1918, CGNAT and IPv6 ULA are blocked too,
 * unless the allowlist (host names or CIDR ranges) opens them. Multicast and reserved ranges are
 * never reachable.
 */
public class SsrfGuard {

    private static final List<Cidr> METADATA = List.of(
            Cidr.parse("169.254.0.0/16"),
            Cidr.parse("100.100.100.200/32"),
            Cidr.parse("fd00:ec2::254/128"),
            Cidr.parse("fe80::/10"));

    private static final List<Cidr> PRIVATE = List.of(
            Cidr.parse("0.0.0.0/8"),
            Cidr.parse("10.0.0.0/8"),
            Cidr.parse("100.64.0.0/10"),
            Cidr.parse("127.0.0.0/8"),
            Cidr.parse("172.16.0.0/12"),
            Cidr.parse("192.0.0.0/24"),
            Cidr.parse("192.168.0.0/16"),
            Cidr.parse("198.18.0.0/15"),
            Cidr.parse("::/128"),
            Cidr.parse("::1/128"),
            Cidr.parse("fc00::/7"));

    private static final List<Cidr> NEVER = List.of(
            Cidr.parse("224.0.0.0/4"),
            Cidr.parse("240.0.0.0/4"),
            Cidr.parse("ff00::/8"));

    private static final Set<String> METADATA_HOSTS = Set.of(
            "metadata.google.internal", "metadata", "instance-data", "metadata.azure.internal");

    private final HostResolver resolver;
    private final Set<String> allowedHosts;
    private final List<Cidr> allowedRanges;
    private final boolean blockPrivate;

    public SsrfGuard(HostResolver resolver, Set<String> allowlist, boolean blockPrivate) {
        this.resolver = resolver;
        this.allowedHosts = allowlist.stream()
                .filter(e -> !Cidr.looksLikeCidr(e))
                .map(e -> e.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
        this.allowedRanges = allowlist.stream().filter(Cidr::looksLikeCidr).map(Cidr::parse).toList();
        this.blockPrivate = blockPrivate;
    }

    /** Default policy: private ranges allowed, metadata blocked. */
    public SsrfGuard(HostResolver resolver, Set<String> allowlist) {
        this(resolver, allowlist, false);
    }

    public void check(URI uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new SsrfBlockedException("scheme", "Only http/https is allowed: " + uri, uri);
        }
        String host = hostOf(uri);
        if (METADATA_HOSTS.contains(host)) {
            throw new SsrfBlockedException("metadata", "Cloud metadata target blocked: " + host, host);
        }
        boolean hostAllowed = allowedHosts.contains(host);
        for (InetAddress address : resolve(host)) {
            if (METADATA.stream().anyMatch(r -> r.contains(address))) {
                throw new SsrfBlockedException("metadata", "Cloud metadata target blocked: " + address.getHostAddress(),
                        address.getHostAddress());
            }
            if (NEVER.stream().anyMatch(r -> r.contains(address)) || address.isMulticastAddress()) {
                throw new SsrfBlockedException("reserved", "Reserved address blocked: " + address.getHostAddress(),
                        address.getHostAddress());
            }
            boolean allowed = hostAllowed || allowedRanges.stream().anyMatch(r -> r.contains(address));
            if (blockPrivate && !allowed && isPrivate(address)) {
                throw new SsrfBlockedException("private", "Internal address blocked (" + address.getHostAddress()
                        + "). Add it to the allowlist to monitor it.", address.getHostAddress());
            }
        }
    }

    private static String hostOf(URI uri) {
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new SsrfBlockedException("no-host", "URL without host: " + uri, uri);
        }
        host = host.toLowerCase(Locale.ROOT);
        return host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host;
    }

    private List<InetAddress> resolve(String host) {
        try {
            List<InetAddress> addresses = resolver.resolve(host);
            if (addresses.isEmpty()) {
                throw new SsrfBlockedException("unresolved", "Could not resolve host: " + host, host);
            }
            return addresses;
        } catch (UnknownHostException e) {
            throw new SsrfBlockedException("unresolved", "Could not resolve host: " + host, host);
        }
    }

    private static boolean isPrivate(InetAddress address) {
        return address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isSiteLocalAddress()
                || PRIVATE.stream().anyMatch(r -> r.contains(address));
    }
}
