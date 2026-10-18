package io.orbit.security.access;

import io.orbit.common.net.Cidr;

import java.net.InetAddress;
import java.util.List;

/**
 * Network access policy replacing login: everyone may read, edits come only from loopback by
 * default ({@link AccessMode}), and view-only clients may acknowledge incidents when enabled.
 */
public record AccessPolicy(AccessMode mode, List<Cidr> ranges, boolean lanAcknowledge) {

    private static final List<Cidr> PRIVATE = List.of(
            Cidr.parse("10.0.0.0/8"), Cidr.parse("172.16.0.0/12"), Cidr.parse("192.168.0.0/16"),
            Cidr.parse("169.254.0.0/16"), Cidr.parse("fc00::/7"), Cidr.parse("fe80::/10"));

    public AccessPolicy {
        ranges = List.copyOf(ranges);
        if (mode == AccessMode.CIDR && ranges.isEmpty()) {
            throw new IllegalArgumentException("CIDR mode needs at least one range");
        }
    }

    public AccessPolicy(AccessMode mode, List<String> cidrs) {
        this(mode, cidrs.stream().map(Cidr::parse).toList(), true);
    }

    public static AccessPolicy loopbackOnly() {
        return new AccessPolicy(AccessMode.LOOPBACK, List.of(), true);
    }

    public AccessPolicy withLanAcknowledge(boolean enabled) {
        return new AccessPolicy(mode, ranges, enabled);
    }

    public boolean canMutate(InetAddress remote) {
        if (remote.isLoopbackAddress()) {
            return true;
        }
        return switch (mode) {
            case LOOPBACK -> false;
            case LAN -> PRIVATE.stream().anyMatch(r -> r.contains(remote));
            case CIDR -> ranges.stream().anyMatch(r -> r.contains(remote));
        };
    }

    /** Where a client sits: {@code loopback}, {@code lan} (private networks) or {@code unknown}. */
    public static String clientKind(InetAddress remote) {
        if (remote.isLoopbackAddress()) {
            return "loopback";
        }
        return PRIVATE.stream().anyMatch(r -> r.contains(remote)) ? "lan" : "unknown";
    }

    public boolean decide(InetAddress remote, AccessAction action) {
        return switch (action) {
            case READ -> true;
            case ACKNOWLEDGE -> lanAcknowledge || canMutate(remote);
            case MUTATE -> canMutate(remote);
        };
    }
}
