package io.orbit.alerting.suppression;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** BE-29: equal alerts (same monitor, severity and channel) within a 5-minute window are sent once. */
public class AlertDeduplicator {

    private record Window(Instant start, int count) {
    }

    private final Duration window;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public AlertDeduplicator(Duration window) {
        this.window = window;
    }

    /** True for the first alert with this key in the window; later ones are grouped (counted). */
    public boolean shouldSend(String key, Instant at) {
        boolean[] send = new boolean[1];
        windows.compute(key, (k, current) -> {
            if (current == null || at.isAfter(current.start().plus(window))) {
                send[0] = true;
                return new Window(at, 1);
            }
            return new Window(current.start(), current.count() + 1);
        });
        return send[0];
    }

    /** How many alerts were grouped under the key in the current window. */
    public int grouped(String key) {
        Window w = windows.get(key);
        return w == null ? 0 : w.count();
    }
}
