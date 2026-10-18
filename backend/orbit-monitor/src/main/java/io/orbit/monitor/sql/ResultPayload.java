package io.orbit.monitor.sql;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Result of a SELECT: typed columns, rows (values may be null), execution time in ms
 * and whether the row limit truncated the result.
 */
public record ResultPayload(List<ResultColumn> columns, List<List<Object>> rows, long ms, boolean truncated) {

    public ResultPayload {
        columns = List.copyOf(columns);
        List<List<Object>> copy = new ArrayList<>(rows.size());
        for (List<Object> row : rows) {
            copy.add(Collections.unmodifiableList(new ArrayList<>(row)));
        }
        rows = Collections.unmodifiableList(copy);
    }

    public int rowCount() {
        return rows.size();
    }

    /** Case-insensitive column index by name; -1 when absent. */
    public int columnIndex(String name) {
        for (int i = 0; i < columns.size(); i++) {
            if (columns.get(i).name().equalsIgnoreCase(name)) {
                return i;
            }
        }
        return -1;
    }

    public Map<String, Object> rowAsMap(int rowIndex) {
        List<Object> row = rows.get(rowIndex);
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < columns.size(); i++) {
            map.put(columns.get(i).name(), row.get(i));
        }
        return map;
    }
}
