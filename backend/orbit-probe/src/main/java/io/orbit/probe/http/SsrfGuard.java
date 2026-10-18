package io.orbit.probe.http;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * SSRF protection for the HttpProbe: resolves DNS and blocks loopback, private ranges, link-local
 * (including cloud metadata 169.254.169.254), CGNAT and IPv6 ULA unless the workspace allowlists them.
 * The allowlist accepts host names ({@code internal.corp}) and CIDR ranges ({@code 10.0.0.0/24}).
 */
public class SsrfGuard {

    private static final List<Cidr> BLOCKED = List.of(
            Cidr.parse("0.0.0.0/8"),
            Cidr.parse("10.0.0.0/8"),
            Cidr.parse("100.64.0.0/10"),
            Cidr.parse("127.0.0.0/8"),
            Cidr.parse("169.254.0.0/16"),
            Cidr.parse("172.16.0.0/12"),
            Cidr.parse("192.0.0.0/24"),
            Cidr.parse("192.168.0.0/16"),
            Cidr.parse("198.18.0.0/15"),
            Cidr.parse("224.0.0.0/4"),
            Cidr.parse("240.0.0.0/4"),
            Cidr.parse("::/128"),
            Cidr.parse("::1/128"),
            Cidr.parse("fc00::/7"),
            Cidr.parse("fe80::/10"),
            Cidr.parse("ff00::/8"));

    private static final Set<String> METADATA_HOSTS = Set.of(
            "metadata.google.internal", "metadata", "instance-data", "metadata.azure.internal");

    private final HostResolver resolver;
    private final Set<String> allowedHosts;
    private final List<Cidr> allowedRanges;

    public SsrfGuard(HostResolver resolver, Set<String> allowlist) {
        this.resolver = resolver;
        this.allowedHosts = allowlist.stream()
                .filter(e -> !Cidr.looksLikeCidr(e))
                .map(e -> e.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
        this.allowedRanges = allowlist.stream().filter(Cidr::looksLikeCidr).map(Cidr::parse).toList();
    }

    public void check(URI uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            throw new SsrfBlockedException("Only http/https is allowed: " + uri);
        }
        String host = hostOf(uri);
        if (allowedHosts.contains(host)) {
            return;
        }
        if (METADATA_HOSTS.contains(host)) {
            throw new SsrfBlockedException("Cloud metadata target blocked: " + host);
        }
        for (InetAddress address : resolve(host)) {
            if (allowedRanges.stream().anyMatch(r -> r.contains(address))) {
                continue;
            }
            if (isBlocked(address)) {
                throw new SsrfBlockedException("Internal address blocked (" + address.getHostAddress()
                        + "). Add it to the workspace allowlist to monitor it.");
            }
        }
    }

    private static String hostOf(URI uri) {
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new SsrfBlockedException("URL without host: " + uri);
        }
        host = host.toLowerCase(Locale.ROOT);
        return host.startsWith("[") && host.endsWith("]") ? host.substring(1, host.length() - 1) : host;
    }

    private List<InetAddress> resolve(String host) {
        try {
            List<InetAddress> addresses = resolver.resolve(host);
            if (addresses.isEmpty()) {
                throw new SsrfBlockedException("Could not resolve host: " + host);
            }
            return addresses;
        } catch (UnknownHostException e) {
            throw new SsrfBlockedException("Could not resolve host: " + host);
        }
    }

    private static boolean isBlocked(InetAddress address) {
        return address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()
                || BLOCKED.stream().anyMatch(r -> r.contains(address));
    }
}
