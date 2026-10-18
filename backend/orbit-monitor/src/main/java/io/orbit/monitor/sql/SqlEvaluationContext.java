package io.orbit.monitor.sql;

import io.orbit.monitor.condition.EvaluationContext;
import io.orbit.monitor.condition.Placeholder;

import java.util.Optional;

/**
 * SQL result values for conditions: {@code [ROWS]}, {@code [EXEC_TIME]} and
 * {@code [COL].NAME} (read from the first row).
 */
public class SqlEvaluationContext implements EvaluationContext {

    private final ResultPayload payload;

    public SqlEvaluationContext(ResultPayload payload) {
        this.payload = payload;
    }

    @Override
    public Optional<Object> resolve(Placeholder placeholder, String path) {
        return switch (placeholder) {
            case ROWS -> Optional.of(payload.rowCount());
            case EXEC_TIME -> Optional.of(payload.ms());
            case COL -> firstRowValue(path);
            default -> Optional.empty();
        };
    }

    private Optional<Object> firstRowValue(String column) {
        int index = payload.columnIndex(column);
        if (index < 0 || payload.rows().isEmpty()) {
            return Optional.empty();
        }
        return Optional.ofNullable(payload.rows().getFirst().get(index));
    }
}
