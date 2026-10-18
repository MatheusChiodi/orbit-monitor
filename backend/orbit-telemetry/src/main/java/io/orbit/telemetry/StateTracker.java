package io.orbit.telemetry;

import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Confirmed state per monitor. DOWN is confirmed only after {@code downAfter} consecutive
 * failing checks ("retries before marking down"); WARN and recoveries apply immediately
 * (flapping around a threshold is handled by condition hysteresis).
 */
public class StateTracker {

    private record Track(MonitorState confirmed, Instant since, int failures, Instant firstFailure) {
    }

    private static final Track INITIAL = new Track(MonitorState.UNKNOWN, null, 0, null);

    private final Map<String, Track> tracks = new ConcurrentHashMap<>();

    public Optional<MonitorStateChanged> observe(String monitorId, MonitorState observed, int downAfter, Instant at) {
        Track[] change = new Track[2];
        tracks.compute(monitorId, (id, current) -> {
            Track track = current == null ? INITIAL : current;
            Track next = next(track, observed, Math.max(1, downAfter), at);
            if (next.confirmed() != track.confirmed()) {
                change[0] = track;
                change[1] = next;
            }
            return next;
        });
        if (change[0] == null) {
            return Optional.empty();
        }
        return Optional.of(new MonitorStateChanged(monitorId, change[0].confirmed(), change[1].confirmed(),
                change[1].since(), at));
    }

    private static Track next(Track track, MonitorState observed, int downAfter, Instant at) {
        if (observed == MonitorState.DOWN && track.confirmed() != MonitorState.DOWN) {
            int failures = track.failures() + 1;
            Instant first = failures == 1 ? at : track.firstFailure();
            return failures >= downAfter
                    ? new Track(MonitorState.DOWN, first, 0, null)
                    : new Track(track.confirmed(), track.since(), failures, first);
        }
        if (observed == track.confirmed()) {
            return new Track(track.confirmed(), track.since(), 0, null);
        }
        return new Track(observed, at, 0, null);
    }

    public MonitorState current(String monitorId) {
        return tracks.getOrDefault(monitorId, INITIAL).confirmed();
    }

    public Optional<Instant> since(String monitorId) {
        return Optional.ofNullable(tracks.getOrDefault(monitorId, INITIAL).since());
    }

    public void forget(String monitorId) {
        tracks.remove(monitorId);
    }
}
