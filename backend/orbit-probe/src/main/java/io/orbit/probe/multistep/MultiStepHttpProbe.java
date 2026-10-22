package io.orbit.probe.multistep;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.JsonPathException;
import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.probe.http.HttpProbe;
import io.orbit.probe.http.HttpProbeException;
import io.orbit.probe.http.HttpProbeRequest;
import io.orbit.probe.http.SsrfBlockedException;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * BE-07: ordered HTTP steps (login, then call the API). Each step may extract values from its JSON
 * body with JSONPath; later steps reference them as {@code ${stepName.variable}} in URL, headers or body.
 * Extracted values may be secrets (tokens), so they live only in memory for one execution and never
 * appear in error messages; only variable names do.
 */
public class MultiStepHttpProbe {

    private static final Pattern VARIABLE = Pattern.compile("\\$\\{([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)}");
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);

    /** @param extract variable name to JSONPath, e.g. {@code token -> $.access_token} */
    public record Step(String name, String method, String url, Map<String, String> headers, String body,
                       Map<String, String> extract) {
    }

    /** @param failedStep null when every step answered */
    public record Result(List<HttpResponseSnapshot> responses, long totalMs, String failedStep, String error) {
    }

    private final HttpProbe probe;
    private final Duration stepTimeout;

    public MultiStepHttpProbe(HttpProbe probe) {
        this(probe, DEFAULT_TIMEOUT);
    }

    public MultiStepHttpProbe(HttpProbe probe, Duration stepTimeout) {
        this.probe = probe;
        this.stepTimeout = stepTimeout;
    }

    public Result execute(List<Step> steps) {
        Map<String, String> variables = new HashMap<>();
        List<HttpResponseSnapshot> responses = new ArrayList<>();
        long totalMs = 0;
        for (Step step : steps) {
            try {
                HttpResponseSnapshot response = probe.execute(request(step, variables));
                responses.add(response);
                totalMs += response.responseTimeMs();
                extract(step, response, variables);
            } catch (StepException | HttpProbeException | SsrfBlockedException | IllegalArgumentException e) {
                return new Result(List.copyOf(responses), totalMs, step.name(), e.getMessage());
            }
        }
        return new Result(List.copyOf(responses), totalMs, null, null);
    }

    private HttpProbeRequest request(Step step, Map<String, String> variables) {
        URI uri;
        try {
            uri = URI.create(resolve(step.url(), variables));
        } catch (IllegalArgumentException e) {
            throw new StepException("Invalid URL in step '" + step.name() + "'");
        }
        Map<String, String> headers = new LinkedHashMap<>();
        if (step.headers() != null) {
            step.headers().forEach((k, v) -> headers.put(k, resolve(v, variables)));
        }
        String body = step.body() == null ? null : resolve(step.body(), variables);
        String method = step.method() == null ? "GET" : step.method();
        return new HttpProbeRequest(method, uri, headers, body, stepTimeout, true);
    }

    private static String resolve(String template, Map<String, String> variables) {
        if (template == null) {
            return null;
        }
        Matcher m = VARIABLE.matcher(template);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String value = variables.get(m.group(1));
            if (value == null) {
                throw new StepException("Unknown variable ${" + m.group(1) + "}");
            }
            m.appendReplacement(sb, Matcher.quoteReplacement(value));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static void extract(Step step, HttpResponseSnapshot response, Map<String, String> variables) {
        if (step.extract() == null || step.extract().isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> e : step.extract().entrySet()) {
            Object value;
            try {
                value = response.body() == null ? null : JsonPath.read(response.body(), e.getValue());
            } catch (JsonPathException | IllegalArgumentException ex) {
                value = null;
            }
            if (value == null) {
                throw new StepException("Could not extract '" + e.getKey() + "' with " + e.getValue()
                        + " (HTTP " + response.status() + ")");
            }
            variables.put(step.name() + "." + e.getKey(), String.valueOf(value));
        }
    }

    /** A step that cannot run or whose response lacks an expected value. */
    private static final class StepException extends RuntimeException {
        StepException(String message) {
            super(message, null, false, false);
        }
    }
}
