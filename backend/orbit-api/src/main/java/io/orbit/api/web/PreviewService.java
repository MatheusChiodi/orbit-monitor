package io.orbit.api.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.api.runtime.ConnectionPools;
import io.orbit.monitor.definition.ConnectionDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.privacy.PayloadRedactor;
import io.orbit.monitor.sql.ColumnType;
import io.orbit.monitor.sql.Dialect;
import io.orbit.monitor.sql.QueryCostAdvisor;
import io.orbit.monitor.sql.SqlParameters;
import io.orbit.monitor.sql.ReadModeSuggester;
import io.orbit.monitor.sql.ResultPayload;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.sql.SqlProbe;
import io.orbit.probe.sql.SqlProbeOptions;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * "Run preview": executes a SELECT or an HTTP request that is not stored yet, with a small row
 * limit, and returns the masked result with detected types and the suggested read mode.
 */
public class PreviewService {

    private static final int PREVIEW_ROWS = 50;
    private static final int MAX_JSON_FIELDS = 200;

    /** Column of the preview grid; {@code type} is number, text, date or boolean. */
    public record PreviewColumn(String name, String type) {
    }

    /** BE-14: NONE, WARN or HEAVY, the interval to use and the localized advice. */
    public record CostView(String level, int suggestedIntervalSeconds, String message) {
    }

    /** @param cost SQL only: is the query too slow for the planned interval (BE-14) */
    public record PreviewResult(List<PreviewColumn> columns, List<Map<String, Object>> rows, long elapsedMs,
                                Integer status, boolean truncated, ReadModeSuggester.Suggestion suggestion,
                                Map<String, List<String>> headers, String body,
                                @JsonInclude(JsonInclude.Include.NON_NULL) CostView cost) {
    }

    private final MonitorDefinitions definitions;
    private final ConnectionPools pools;
    private final SqlProbe sqlProbe;
    private final HttpProbe httpProbe;
    private final PayloadRedactor redactor;
    private final ObjectMapper json = new ObjectMapper();
    private final ReadModeSuggester suggester = new ReadModeSuggester();

    private final Messages messages;

    public PreviewService(MonitorDefinitions definitions, ConnectionPools pools, SqlProbe sqlProbe,
                          HttpProbe httpProbe, PayloadRedactor redactor, Messages messages) {
        this.messages = messages;
        this.definitions = definitions;
        this.pools = pools;
        this.sqlProbe = sqlProbe;
        this.httpProbe = httpProbe;
        this.redactor = redactor;
    }

    public PreviewResult sql(String connectionId, String sql) {
        return sql(connectionId, sql, Map.of(), 60);
    }

    /** BE-11 parameters are bound like in the monitor; BE-14 compares the time with the interval. */
    public PreviewResult sql(String connectionId, String sql, Map<String, Object> parameters, int intervalSeconds) {
        ConnectionDef connection = definitions.connection(connectionId)
                .orElseThrow(() -> new NotFoundException("Connection", connectionId));
        Map<String, Object> params = parameters == null ? Map.of() : parameters;
        if (sql != null && params.isEmpty() && !SqlParameters.names(sql).isEmpty()) {
            SqlParameters.bind(sql, params); // names every :param without a value (sql.missing-parameter)
        }
        ResultPayload raw = sqlProbe.execute(pools.dataSource(connection), Dialect.fromJdbcUrl(connection.jdbcUrl()),
                sql, params,
                new SqlProbeOptions(PREVIEW_ROWS, Duration.ofSeconds(30), PREVIEW_ROWS));
        ResultPayload masked = redactor.redact(raw);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < masked.rowCount(); i++) {
            rows.add(masked.rowAsMap(i));
        }
        List<PreviewColumn> columns = masked.columns().stream()
                .map(c -> new PreviewColumn(c.name(), typeName(c.type()))).toList();
        QueryCostAdvisor.Advice advice = QueryCostAdvisor.advise(Duration.ofMillis(masked.ms()), intervalSeconds);
        CostView cost = new CostView(advice.level().name(), advice.suggestedIntervalSeconds(),
                messages.current(advice.messageKey(), advice.suggestedIntervalSeconds()));
        return new PreviewResult(columns, rows, masked.ms(), null, masked.truncated(), suggester.suggest(masked),
                null, null, cost);
    }

    public PreviewResult http(String method, String url, Map<String, String> headers, String body) {
        HttpResponseSnapshot raw = httpProbe.execute(new HttpProbeRequest(method == null ? "GET" : method,
                URI.create(url), headers, body, Duration.ofSeconds(15), true));
        HttpResponseSnapshot masked = redactor.redact(raw);
        Map<String, Object> row = new LinkedHashMap<>();
        List<PreviewColumn> columns = new ArrayList<>();
        row.put("[STATUS]", masked.status());
        columns.add(new PreviewColumn("[STATUS]", "number"));
        row.put("[RESPONSE_TIME]", masked.responseTimeMs());
        columns.add(new PreviewColumn("[RESPONSE_TIME]", "number"));
        if (masked.certDaysLeft() != null) {
            row.put("[CERT_DAYS_LEFT]", masked.certDaysLeft());
            columns.add(new PreviewColumn("[CERT_DAYS_LEFT]", "number"));
        }
        flattenJson(masked.body(), row, columns);
        return new PreviewResult(columns, List.of(row), masked.responseTimeMs(), masked.status(), false, null,
                masked.headers(), masked.body(), null);
    }

    /** Lists JSON leaves as {@code $.a.b} fields so the operator can pick them in "Data and display". */
    private void flattenJson(String body, Map<String, Object> row, List<PreviewColumn> columns) {
        if (body == null || !(body.strip().startsWith("{") || body.strip().startsWith("["))) {
            return;
        }
        try {
            walk(json.readTree(body), "$", row, columns);
        } catch (java.io.IOException e) {
            // not JSON: the body is still returned as text
        }
    }

    private void walk(JsonNode node, String path, Map<String, Object> row, List<PreviewColumn> columns) {
        if (columns.size() >= MAX_JSON_FIELDS) {
            return;
        }
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> f = fields.next();
                walk(f.getValue(), path + "." + f.getKey(), row, columns);
            }
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                walk(node.get(i), path + "[" + i + "]", row, columns);
            }
        } else {
            row.put(path, node.isNumber() ? node.numberValue() : node.isBoolean() ? node.booleanValue()
                    : node.isNull() ? null : node.asText());
            columns.add(new PreviewColumn(path, node.isNumber() ? "number" : node.isBoolean() ? "boolean" : "text"));
        }
    }

    static String typeName(ColumnType type) {
        return type == ColumnType.OTHER ? "text" : type.name().toLowerCase(Locale.ROOT);
    }
}
