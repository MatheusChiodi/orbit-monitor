package io.orbit.monitor.definition;

import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Validation of multi-step requests (BE-07) and OAuth2 client credentials (BE-08). */
final class HttpExtrasValidator {

    private static final Pattern NAME = Pattern.compile("[A-Za-z0-9_-]{1,40}");
    private static final Set<String> METHODS = Set.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    private static final int MAX_STEPS = 10;

    private HttpExtrasValidator() {
    }

    static void validate(HttpMonitorDef r, List<String> errors) {
        if (r.steps().size() > MAX_STEPS) {
            errors.add(r.id() + ": at most " + MAX_STEPS + " steps");
        }
        Set<String> names = new HashSet<>();
        for (HttpMonitorDef.Step step : r.steps()) {
            String label = r.id() + ": step " + step.name();
            if (step.name() == null || !NAME.matcher(step.name()).matches()) {
                errors.add(label + ": step name must be letters, digits, '_' or '-'");
            } else if (!names.add(step.name())) {
                errors.add(label + ": step names must be unique");
            }
            if (step.method() != null && !METHODS.contains(step.method().toUpperCase(Locale.ROOT))) {
                errors.add(label + ": unsupported method " + step.method());
            }
            if (!httpUrl(step.url())) {
                errors.add(label + ": url must be http(s)://host/...");
            }
            if (step.extract() != null) {
                step.extract().keySet().stream().filter(k -> !NAME.matcher(k).matches())
                        .forEach(k -> errors.add(label + ": variable name " + k + " is not valid"));
            }
        }
        HttpMonitorDef.OAuth oauth = r.oauth();
        if (oauth != null) {
            if (!httpUrl(oauth.tokenUrl())) {
                errors.add(r.id() + ": oauth.tokenUrl must be http(s)://host/...");
            }
            DefinitionValidators.required(r.id(), "oauth.clientId", oauth.clientId(), errors);
            if (oauth.clientSecret() == null) {
                errors.add(r.id() + ": oauth.clientSecret is required (vault reference)");
            }
        }
    }

    /** Templated URLs ({@code https://${login.host}/x}) are checked again when the step runs. */
    private static boolean httpUrl(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        if (url.contains("${")) {
            return url.startsWith("http://") || url.startsWith("https://");
        }
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            return (scheme.equals("http") || scheme.equals("https")) && uri.getHost() != null;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
