package io.orbit.monitor.sql;

import java.util.Arrays;
import java.util.List;

/**
 * Suggests a read mode from the shape of the result:
 * <ul>
 *   <li>0 rows → row count</li>
 *   <li>1 row, 1 numeric column → single value</li>
 *   <li>1 row, N columns → indicator card</li>
 *   <li>N rows with a date and a number column → time series</li>
 *   <li>N rows, category + number → ranking</li>
 *   <li>anything else → table</li>
 * </ul>
 */
public class ReadModeSuggester {

    public record Suggestion(ReadMode suggested, List<ReadMode> alternatives) {
    }

    public Suggestion suggest(ResultPayload payload) {
        ReadMode mode = pick(payload);
        List<ReadMode> alternatives = Arrays.stream(ReadMode.values()).filter(m -> m != mode).toList();
        return new Suggestion(mode, alternatives);
    }

    private static ReadMode pick(ResultPayload payload) {
        List<ResultColumn> cols = payload.columns();
        long numbers = count(cols, ColumnType.NUMBER);
        long dates = count(cols, ColumnType.DATE);
        long texts = count(cols, ColumnType.TEXT);

        if (payload.rowCount() == 0) {
            return ReadMode.ROW_COUNT;
        }
        if (payload.rowCount() == 1) {
            if (cols.size() == 1) {
                return numbers == 1 ? ReadMode.SINGLE_VALUE : ReadMode.TABLE;
            }
            return ReadMode.INDICATOR_CARD;
        }
        if (dates >= 1 && numbers >= 1) {
            return ReadMode.TIME_SERIES;
        }
        if (texts == 1 && numbers >= 1 && texts + numbers == cols.size()) {
            return ReadMode.RANKING;
        }
        return ReadMode.TABLE;
    }

    private static long count(List<ResultColumn> cols, ColumnType type) {
        return cols.stream().filter(c -> c.type() == type).count();
    }
}
