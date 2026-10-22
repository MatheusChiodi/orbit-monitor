package io.orbit.monitor.http;

import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.JsonPathException;
import io.orbit.common.privacy.DataClass;
import io.orbit.common.privacy.SensitiveDataRedactor;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** BE-23: numeric values extracted from a JSON body by JSONPath, stored as series ({@code $.queue.size}). */
public final class MetricExtractor {

    private static final SensitiveDataRedactor REDACTOR = new SensitiveDataRedactor();
    /** Last property name of a path: {@code $.a.b} -> b, {@code $['a']['b']} -> b. */
    private static final Pattern LEAF = Pattern.compile("(?:\\.|\\[['\"])([A-Za-z_][\\w-]*)['\"]?]?(?:\\[\\d+])*$");

    private MetricExtractor() {
    }

    /**
     * Values for the paths that hold a number (or a numeric string); other paths are left out.
     * Paths that can match several values ({@code [*]}, filters, deep scan) are not a single metric,
     * and card fields (PAN, CVV) are never extracted (docs/04-data-protection.md).
     */
    public static Map<String, Double> extract(String body, List<String> jsonPaths) {
        Map<String, Double> values = new LinkedHashMap<>();
        if (body == null || body.isBlank() || jsonPaths == null || jsonPaths.isEmpty()) {
            return values;
        }
        DocumentContext document;
        try {
            document = JsonPath.parse(body);
        } catch (JsonPathException | IllegalArgumentException e) {
            return values;
        }
        for (String path : jsonPaths) {
            if (path == null || path.isBlank() || isCardField(path)) {
                continue;
            }
            Double value = read(document, path);
            if (value != null) {
                values.put(path, value);
            }
        }
        return values;
    }

    private static Double read(DocumentContext document, String path) {
        try {
            JsonPath compiled = JsonPath.compile(path.startsWith("$") ? path : "$." + path);
            if (!compiled.isDefinite()) {
                return null;
            }
            return toNumber(document.read(compiled));
        } catch (JsonPathException | IllegalArgumentException | ClassCastException e) {
            return null;
        }
    }

    private static Double toNumber(Object raw) {
        if (raw == null || REDACTOR.containsCardNumber(String.valueOf(raw))) {
            return null;
        }
        double value;
        if (raw instanceof Number n) {
            value = n.doubleValue();
        } else if (raw instanceof String s && !s.isBlank()) {
            try {
                value = new BigDecimal(s.strip()).doubleValue();
            } catch (NumberFormatException e) {
                return null;
            }
        } else {
            return null;
        }
        return Double.isFinite(value) ? value : null;
    }

    private static boolean isCardField(String path) {
        Matcher leaf = LEAF.matcher(path.strip());
        if (!leaf.find()) {
            return false;
        }
        DataClass dataClass = REDACTOR.classifyName(leaf.group(1));
        return dataClass == DataClass.PCI_PAN || dataClass == DataClass.PCI_SAD;
    }
}
