package io.orbit.monitor.sql;

import java.time.Duration;

/**
 * BE-14: warns about heavy queries from the preview time and suggests a longer interval
 * (or a materialized view) so a monitor never loads the database it watches.
 */
public final class QueryCostAdvisor {

    public enum Level { NONE, WARN, HEAVY }

    /** @param messageKey i18n key for the console text */
    public record Advice(Level level, int suggestedIntervalSeconds, String messageKey) {
    }

    static final Duration WARN_FROM = Duration.ofSeconds(1);
    static final Duration HEAVY_FROM = Duration.ofSeconds(10);
    /** The query may use at most 1/60 of the wall time: interval >= 60 x preview time. */
    static final int INTERVAL_FACTOR = 60;
    static final int HEAVY_MIN_INTERVAL_SECONDS = 900;
    private static final int MAX_INTERVAL_SECONDS = 86_400;

    private QueryCostAdvisor() {
    }

    /**
     * NONE below 1 s; WARN from 1 s, suggesting an interval of at least 60x the preview time;
     * HEAVY from 10 s, suggesting at least 15 min and a view. A longer current interval is kept.
     */
    public static Advice advise(Duration previewTime, int intervalSeconds) {
        Duration preview = previewTime == null || previewTime.isNegative() ? Duration.ZERO : previewTime;
        int current = Math.max(intervalSeconds, 0);
        if (preview.compareTo(WARN_FROM) < 0) {
            return new Advice(Level.NONE, current, "sql.cost.none");
        }
        long proportional = Math.ceilDiv(preview.toMillis() * INTERVAL_FACTOR, 1000L);
        if (preview.compareTo(HEAVY_FROM) < 0) {
            return new Advice(Level.WARN, suggest(current, proportional), "sql.cost.warn");
        }
        long floor = Math.max(proportional, HEAVY_MIN_INTERVAL_SECONDS);
        return new Advice(Level.HEAVY, suggest(current, floor), "sql.cost.heavy");
    }

    private static int suggest(int current, long minimum) {
        return (int) Math.min(MAX_INTERVAL_SECONDS, Math.max(current, minimum));
    }
}
