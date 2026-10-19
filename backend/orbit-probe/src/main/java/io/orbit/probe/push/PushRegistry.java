package io.orbit.probe.push;

import io.orbit.common.MonitorState;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;

/**
 * BE-03: push monitors. Orbit generates a secret URL token; the job calls it when it finishes.
 * No signal for longer than {@code maxSilence} means DOWN.
 */
public class PushRegistry {

    public PushRegistry(Clock clock) {
    }

    /** Registers (or rotates) the token of a push monitor; returns the new secret token. */
    public String register(String monitorId, Duration maxSilence) {
        throw new UnsupportedOperationException("BE-03 push monitor is not implemented yet");
    }

    /** Records a signal; returns the monitor id when the token is valid. */
    public Optional<String> receive(String token) {
        throw new UnsupportedOperationException("BE-03 push monitor is not implemented yet");
    }

    public MonitorState state(String monitorId) {
        throw new UnsupportedOperationException("BE-03 push monitor is not implemented yet");
    }
}
