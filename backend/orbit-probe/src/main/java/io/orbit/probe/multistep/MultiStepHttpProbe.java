package io.orbit.probe.multistep;

import io.orbit.monitor.http.HttpResponseSnapshot;
import io.orbit.probe.http.HttpProbe;

import java.util.List;
import java.util.Map;

/**
 * BE-07: ordered HTTP steps (login, then call the API). Each step may extract values from its JSON
 * body with JSONPath; later steps reference them as {@code ${stepName.variable}} in URL, headers or body.
 */
public class MultiStepHttpProbe {

    /** @param extract variable name to JSONPath, e.g. {@code token -> $.access_token} */
    public record Step(String name, String method, String url, Map<String, String> headers, String body,
                       Map<String, String> extract) {
    }

    /** @param failedStep null when every step answered */
    public record Result(List<HttpResponseSnapshot> responses, long totalMs, String failedStep, String error) {
    }

    public MultiStepHttpProbe(HttpProbe probe) {
    }

    public Result execute(List<Step> steps) {
        throw new UnsupportedOperationException("BE-07 multi-step HTTP is not implemented yet");
    }
}
