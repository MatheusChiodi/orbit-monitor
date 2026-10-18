package io.orbit.monitor.privacy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import io.orbit.common.privacy.SensitiveDataRedactor;
import io.orbit.monitor.condition.Condition;
import io.orbit.monitor.condition.ConditionResult;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.monitor.sql.ResultColumn;
import io.orbit.monitor.sql.ResultPayload;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Applies {@link SensitiveDataRedactor} to whole probe results at the probe boundary:
 * SQL rows (by column name and value), HTTP bodies (JSON tree or plain text), headers and
 * condition results. Raw values never leave the probe; only the masked copies do.
 */
public class PayloadRedactor {

    private static final Set<String> SECRET_HEADERS = Set.of("authorization", "proxy-authorization", "cookie",
            "set-cookie", "x-api-key", "x-auth-token");
    private static final String DOTS = "••••";

    private final SensitiveDataRedactor redactor;
    private final ObjectMapper json = new ObjectMapper();

    public PayloadRedactor(SensitiveDataRedactor redactor) {
        this.redactor = redactor;
    }

    public ResultPayload redact(ResultPayload payload) {
        List<ResultColumn> columns = payload.columns();
        List<List<Object>> rows = new ArrayList<>(payload.rowCount());
        for (List<Object> row : payload.rows()) {
            List<Object> masked = new ArrayList<>(row.size());
            for (int i = 0; i < row.size(); i++) {
                masked.add(redactor.redact(columns.get(i).name(), row.get(i)));
            }
            rows.add(masked);
        }
        return new ResultPayload(columns, rows, payload.ms(), payload.truncated());
    }

    public HttpResponseSnapshot redact(HttpResponseSnapshot response) {
        Map<String, List<String>> headers = new LinkedHashMap<>();
        response.headers().forEach((name, values) -> headers.put(name, SECRET_HEADERS.contains(
                name.toLowerCase(Locale.ROOT))
                ? List.of(DOTS)
                : values.stream().map(v -> String.valueOf(redactor.redact(name, v))).toList()));
        return new HttpResponseSnapshot(response.status(), response.responseTimeMs(), redactBody(response.body()),
                headers, response.certDaysLeft());
    }

    public ConditionResult redact(ConditionResult result) {
        Condition condition = result.condition();
        String field = condition.path() != null ? condition.path() : condition.placeholder().name();
        Object masked = redactor.redact(field, result.actual());
        String message = result.message();
        if (result.actual() != null && !Objects.equals(masked, result.actual())) {
            message = message.replace(String.valueOf(result.actual()), String.valueOf(masked));
        }
        return new ConditionResult(condition, result.passed(), masked, redactor.redactText(message));
    }

    /** Masks free text such as error messages before they leave the probe. */
    public String redactText(String text) {
        return redactor.redactText(text);
    }

    private String redactBody(String body) {
        if (body == null || body.isBlank()) {
            return body;
        }
        String trimmed = body.strip();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
                JsonNode tree = json.readTree(trimmed);
                return json.writeValueAsString(redactNode(tree, null));
            } catch (JsonProcessingException e) {
                // not valid JSON: fall back to text scanning
            }
        }
        return redactor.redactText(body);
    }

    private JsonNode redactNode(JsonNode node, String fieldName) {
        if (node instanceof ObjectNode object) {
            Iterator<Map.Entry<String, JsonNode>> fields = object.fields();
            List<Map.Entry<String, JsonNode>> entries = new ArrayList<>();
            fields.forEachRemaining(entries::add);
            for (Map.Entry<String, JsonNode> entry : entries) {
                object.set(entry.getKey(), redactNode(entry.getValue(), entry.getKey()));
            }
            return object;
        }
        if (node instanceof ArrayNode array) {
            for (int i = 0; i < array.size(); i++) {
                array.set(i, redactNode(array.get(i), fieldName));
            }
            return array;
        }
        if (node.isTextual() || node.isNumber()) {
            Object value = node.isTextual() ? node.asText() : node.numberValue();
            Object masked = redactor.redact(fieldName, value);
            return Objects.equals(masked, value) ? node : TextNode.valueOf(String.valueOf(masked));
        }
        return node;
    }
}
