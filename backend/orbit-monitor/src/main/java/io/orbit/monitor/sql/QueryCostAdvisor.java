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

    private QueryCostAdvisor() {
    }

    /**
     * NONE below 1 s; WARN from 1 s, suggesting an interval of at least 60x the preview time;
     * HEAVY from 10 s, suggesting at least 15 min and a view.
     */
    public static Advice advise(Duration previewTime, int intervalSeconds) {
        throw new UnsupportedOperationException("BE-14 query cost warning is not implemented yet");
    }
}
