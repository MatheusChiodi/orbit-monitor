package io.orbit.monitor.sql;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Resultado de um SELECT: colunas com tipos, linhas (valores podem ser nulos),
 * tempo de execução em ms e se o resultado foi cortado pelo limite de linhas.
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

    /** Índice da coluna pelo nome, sem diferenciar caixa; -1 se não existir. */
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
