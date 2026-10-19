package io.orbit.monitor.http;

import java.util.List;
import java.util.Map;

/** BE-23: numeric values extracted from a JSON body by JSONPath, stored as series ({@code $.queue.size}). */
public final class MetricExtractor {

    private MetricExtractor() {
    }

    /** Values for the paths that hold a number (or a numeric string); other paths are left out. */
    public static Map<String, Double> extract(String body, List<String> jsonPaths) {
        throw new UnsupportedOperationException("BE-23 body metric extraction is not implemented yet");
    }
}
