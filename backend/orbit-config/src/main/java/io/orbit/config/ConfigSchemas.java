package io.orbit.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * CORE-19: every config file has a JSON Schema ({@code schemas/orbit.<feature>.schema.json} on the
 * classpath) validated on read and on write by {@link ConfigFile}. Only version 1 exists today, so
 * there is nothing to migrate yet; a future version adds its migration to {@link ConfigFile}.
 */
public final class ConfigSchemas {

    private static final List<String> FEATURES = List.of("settings", "connections", "requests", "selects", "checks",
            "query-catalog", "groups", "layouts", "channels", "escalation", "maintenance", "silences", "themes",
            "variables", "status-pages", "workspaces");
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Map<String, SchemaValidator> VALIDATORS = new ConcurrentHashMap<>();

    private ConfigSchemas() {
    }

    /** Schema violations of a document (empty when valid); unknown features fail. */
    public static List<String> validate(String feature, String json) {
        JsonNode document;
        try {
            document = MAPPER.readTree(json);
        } catch (JsonProcessingException e) {
            requireKnown(feature);
            return List.of("$: is not valid JSON (line " + e.getLocation().getLineNr() + ")");
        }
        return validate(feature, document);
    }

    /** Schema violations of an already parsed document. */
    public static List<String> validate(String feature, JsonNode document) {
        requireKnown(feature);
        return VALIDATORS.computeIfAbsent(feature, ConfigSchemas::load).validate(document);
    }

    /** Features that have a schema. */
    public static List<String> features() {
        return FEATURES;
    }

    public static boolean has(String feature) {
        return FEATURES.contains(feature);
    }

    private static void requireKnown(String feature) {
        if (!has(feature)) {
            throw new IllegalArgumentException("No schema for config feature: " + feature);
        }
    }

    private static SchemaValidator load(String feature) {
        String resource = "/schemas/orbit." + feature + ".schema.json";
        try (InputStream in = ConfigSchemas.class.getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException("Missing schema resource " + resource);
            }
            return new SchemaValidator(MAPPER.readTree(in));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + resource, e);
        }
    }
}
