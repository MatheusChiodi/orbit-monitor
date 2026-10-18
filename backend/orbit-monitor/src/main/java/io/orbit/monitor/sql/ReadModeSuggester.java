package io.orbit.monitor.sql;

import java.util.Arrays;
import java.util.List;

/**
 * Sugere o modo de leitura a partir do formato do resultado:
 * <ul>
 *   <li>0 linhas → contagem de linhas</li>
 *   <li>1 linha, 1 coluna numérica → valor único</li>
 *   <li>1 linha, N colunas → cartão de indicadores</li>
 *   <li>N linhas com coluna de data e número → série temporal</li>
 *   <li>N linhas, categoria + número → ranking</li>
 *   <li>demais casos → tabela</li>
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
