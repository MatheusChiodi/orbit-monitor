package io.orbit.history.rollup;

import java.time.Duration;

/** Stored resolutions; charts pick one with {@link #auto(long, long)} (docs/08 section 4). */
public enum Resolution {

    RAW("raw", 0),
    MINUTE("1m", 60_000),
    HOUR("1h", 3_600_000);

    private static final long SIX_HOURS = Duration.ofHours(6).toMillis();
    private static final long SEVEN_DAYS = Duration.ofDays(7).toMillis();

    private final String label;
    private final long millis;

    Resolution(String label, long millis) {
        this.label = label;
        this.millis = millis;
    }

    public String label() {
        return label;
    }

    public long millis() {
        return millis;
    }

    public long bucketStart(long at) {
        return millis == 0 ? at : Math.floorDiv(at, millis) * millis;
    }

    /** ≤ 6 h → raw, ≤ 7 d → 1-minute, otherwise 1-hour. */
    public static Resolution auto(long from, long to) {
        long span = to - from;
        if (span <= SIX_HOURS) {
            return RAW;
        }
        return span <= SEVEN_DAYS ? MINUTE : HOUR;
    }

    /** Parses {@code auto|raw|1m|1h}; {@code auto} or null picks by span. */
    public static Resolution parse(String value, long from, long to) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("auto")) {
            return auto(from, to);
        }
        for (Resolution r : values()) {
            if (r.label.equalsIgnoreCase(value) || r.name().equalsIgnoreCase(value)) {
                return r;
            }
        }
        throw new IllegalArgumentException("resolution must be auto, raw, 1m or 1h");
    }
}
