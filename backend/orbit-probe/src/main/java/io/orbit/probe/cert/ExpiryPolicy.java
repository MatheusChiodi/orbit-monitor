package io.orbit.probe.cert;

import io.orbit.common.MonitorState;

import java.time.Instant;
import java.util.Optional;

/** BE-05: certificate and domain expiry warnings (30/14/7 days) and RDAP domain expiry parsing. */
public final class ExpiryPolicy {

    private ExpiryPolicy() {
    }

    /** OK above 30 days, WARN from 30 to 8 days, DOWN at 7 days or less (and when expired). */
    public static MonitorState stateFor(long daysLeft) {
        throw new UnsupportedOperationException("BE-05 expiry warnings are not implemented yet");
    }

    /** The warning step just crossed (30, 14 or 7), used to notify once per step. */
    public static Optional<Integer> warningStep(long daysLeft) {
        throw new UnsupportedOperationException("BE-05 expiry warnings are not implemented yet");
    }

    /** Domain expiry from an RDAP JSON response ({@code events[eventAction=expiration].eventDate}). */
    public static Optional<Instant> domainExpiry(String rdapJson) {
        throw new UnsupportedOperationException("BE-05 RDAP parsing is not implemented yet");
    }
}
