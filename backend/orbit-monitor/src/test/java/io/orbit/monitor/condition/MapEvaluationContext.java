package io.orbit.monitor.condition;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/** Contexto de teste: valores registrados por placeholder + path. */
final class MapEvaluationContext implements EvaluationContext {

    private final Map<String, Object> values = new HashMap<>();

    MapEvaluationContext with(Placeholder placeholder, String path, Object value) {
        values.put(key(placeholder, path), value);
        return this;
    }

    MapEvaluationContext with(Placeholder placeholder, Object value) {
        return with(placeholder, null, value);
    }

    @Override
    public Optional<Object> resolve(Placeholder placeholder, String path) {
        return Optional.ofNullable(values.get(key(placeholder, path)));
    }

    private static String key(Placeholder placeholder, String path) {
        return placeholder + "|" + (path == null ? "" : path);
    }
}
