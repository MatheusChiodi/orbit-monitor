package io.orbit.monitor.http;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.JsonPathException;
import io.orbit.monitor.condition.EvaluationContext;
import io.orbit.monitor.condition.Placeholder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Valores de uma resposta HTTP para as condições. {@code [BODY].a.b} é lido via JSONPath
 * ({@code $.a.b}); sem caminho, {@code [BODY]} é o texto inteiro.
 */
public class HttpEvaluationContext implements EvaluationContext {

    private final HttpResponseSnapshot response;

    public HttpEvaluationContext(HttpResponseSnapshot response) {
        this.response = response;
    }

    @Override
    public Optional<Object> resolve(Placeholder placeholder, String path) {
        return switch (placeholder) {
            case STATUS -> Optional.of(response.status());
            case RESPONSE_TIME -> Optional.of(response.responseTimeMs());
            case CERT_DAYS_LEFT -> Optional.ofNullable(response.certDaysLeft());
            case BODY -> path == null ? Optional.ofNullable(response.body()) : jsonValue(path);
            case HEADER -> header(path);
            default -> Optional.empty();
        };
    }

    private Optional<Object> jsonValue(String path) {
        if (response.body() == null || response.body().isBlank()) {
            return Optional.empty();
        }
        String jsonPath = path.startsWith("$") ? path : "$." + path;
        try {
            return Optional.ofNullable(JsonPath.read(response.body(), jsonPath));
        } catch (JsonPathException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private Optional<Object> header(String name) {
        for (Map.Entry<String, List<String>> entry : response.headers().entrySet()) {
            if (entry.getKey().equalsIgnoreCase(name) && !entry.getValue().isEmpty()) {
                return Optional.of(String.join(", ", entry.getValue()));
            }
        }
        return Optional.empty();
    }
}
