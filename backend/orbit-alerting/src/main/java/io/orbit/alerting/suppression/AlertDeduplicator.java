package io.orbit.alerting.suppression;

import java.time.Duration;
import java.time.Instant;

/** BE-29: equal alerts (same monitor, severity and channel) within a 5-minute window are sent once. */
public class AlertDeduplicator {

    public AlertDeduplicator(Duration window) {
    }

    /** True for the first alert with this key in the window; later ones are grouped (counted). */
    public boolean shouldSend(String key, Instant at) {
        throw new UnsupportedOperationException("BE-29 deduplication is not implemented yet");
    }

    /** How many alerts were grouped under the key in the current window. */
    public int grouped(String key) {
        throw new UnsupportedOperationException("BE-29 deduplication is not implemented yet");
    }
}
