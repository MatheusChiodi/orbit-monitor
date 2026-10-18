package io.orbit.security.access;

/** Who may change configuration (stored in orbit.settings.json). */
public enum AccessMode {
    /** Only the machine running Orbit (default). */
    LOOPBACK,
    /** Loopback plus private networks (RFC 1918, IPv6 ULA, link-local). */
    LAN,
    /** Loopback plus an explicit list of CIDR ranges. */
    CIDR
}
