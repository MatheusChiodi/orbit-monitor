package io.orbit.config;

import java.util.List;

/**
 * CORE-19: every config file has a JSON Schema ({@code schemas/orbit.<feature>.schema.json} on the
 * classpath) validated on read and on write, and older {@code version}s are migrated on load.
 */
public final class ConfigSchemas {

    private ConfigSchemas() {
    }

    /** Schema violations of a document (empty when valid); unknown features fail. */
    public static List<String> validate(String feature, String json) {
        throw new UnsupportedOperationException("CORE-19 JSON Schema validation is not implemented yet");
    }

    /** Features that have a schema. */
    public static List<String> features() {
        throw new UnsupportedOperationException("CORE-19 JSON Schema validation is not implemented yet");
    }
}
