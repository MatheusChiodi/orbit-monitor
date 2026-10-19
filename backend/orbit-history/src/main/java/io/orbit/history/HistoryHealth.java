package io.orbit.history;

import java.util.List;

/**
 * Self-monitoring view of the store: low-disk mode, disk cap hits, dropped records and the latest
 * warnings (quarantined segments, torn tails, write failures). Feeds an Orbit self-monitoring alert.
 */
public record HistoryHealth(boolean rawWritesEnabled, boolean diskCapExceeded, long droppedRecords,
                            long diskBytes, List<String> warnings) {

    public HistoryHealth {
        warnings = List.copyOf(warnings);
    }

    public boolean degraded() {
        return !rawWritesEnabled || diskCapExceeded || droppedRecords > 0;
    }
}
