package io.orbit.config;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * CORE-19: a small JSON Schema (draft 2020-12) validator covering the keywords Orbit's config schemas
 * use: {@code type}, {@code required}, {@code properties}, {@code additionalProperties}, {@code items},
 * {@code enum}, {@code const}, {@code minimum}, {@code maximum}, {@code minLength}, {@code minItems},
 * {@code pattern}, {@code anyOf}, {@code oneOf} and local {@code $ref}s ({@code #/$defs/...}).
 * Violations name the path and the rule, never the offending value (it may be a secret).
 */
final class SchemaValidator {

    private final JsonNode root;

    SchemaValidator(JsonNode root) {
        this.root = root;
    }

    List<String> validate(JsonNode document) {
        List<String> errors = new ArrayList<>();
        check(root, document, "$", errors);
        return errors;
    }

    private void check(JsonNode schema, JsonNode value, String path, List<String> errors) {
        if (schema.isBoolean()) {
            if (!schema.asBoolean()) {
                errors.add(path + ": is not allowed");
            }
            return;
        }
        if (schema.has("$ref")) {
            check(resolve(schema.get("$ref").asText()), value, path, errors);
        }
        if (schema.has("type") && !typeMatches(schema.get("type"), value)) {
            errors.add(path + ": must be " + typeNames(schema.get("type")));
            return;
        }
        if (schema.has("const") && !schema.get("const").equals(value)) {
            errors.add(path + ": must be " + schema.get("const"));
        }
        if (schema.has("enum") && !contains(schema.get("enum"), value)) {
            errors.add(path + ": must be one of " + schema.get("enum"));
        }
        if (value.isNumber()) {
            numeric(schema, value, path, errors);
        }
        if (value.isTextual()) {
            text(schema, value.asText(), path, errors);
        }
        if (value.isObject()) {
            object(schema, value, path, errors);
        }
        if (value.isArray()) {
            array(schema, value, path, errors);
        }
        if (schema.has("anyOf") && matching(schema.get("anyOf"), value, path) == 0) {
            errors.add(path + ": does not match any allowed form");
        }
        if (schema.has("oneOf") && matching(schema.get("oneOf"), value, path) != 1) {
            errors.add(path + ": must match exactly one allowed form");
        }
    }

    private static void numeric(JsonNode schema, JsonNode value, String path, List<String> errors) {
        if (schema.has("minimum") && value.asDouble() < schema.get("minimum").asDouble()) {
            errors.add(path + ": must be at least " + schema.get("minimum"));
        }
        if (schema.has("maximum") && value.asDouble() > schema.get("maximum").asDouble()) {
            errors.add(path + ": must be at most " + schema.get("maximum"));
        }
    }

    private static void text(JsonNode schema, String text, String path, List<String> errors) {
        if (schema.has("minLength") && text.codePointCount(0, text.length()) < schema.get("minLength").asInt()) {
            errors.add(path + ": must have at least " + schema.get("minLength") + " characters");
        }
        if (schema.has("pattern") && !Pattern.compile(schema.get("pattern").asText()).matcher(text).find()) {
            errors.add(path + ": has an invalid format");
        }
    }

    private void object(JsonNode schema, JsonNode value, String path, List<String> errors) {
        for (JsonNode name : schema.path("required")) {
            if (!value.has(name.asText())) {
                errors.add(path + "." + name.asText() + ": is required");
            }
        }
        JsonNode properties = schema.path("properties");
        JsonNode additional = schema.get("additionalProperties");
        Iterator<Map.Entry<String, JsonNode>> fields = value.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String child = path + "." + field.getKey();
            if (properties.has(field.getKey())) {
                check(properties.get(field.getKey()), field.getValue(), child, errors);
            } else if (additional != null) {
                check(additional, field.getValue(), child, errors);
            }
        }
    }

    private void array(JsonNode schema, JsonNode value, String path, List<String> errors) {
        if (schema.has("minItems") && value.size() < schema.get("minItems").asInt()) {
            errors.add(path + ": must have at least " + schema.get("minItems") + " items");
        }
        if (schema.has("items")) {
            for (int i = 0; i < value.size(); i++) {
                check(schema.get("items"), value.get(i), path + "[" + i + "]", errors);
            }
        }
    }

    private int matching(JsonNode alternatives, JsonNode value, String path) {
        int count = 0;
        for (JsonNode alternative : alternatives) {
            List<String> errors = new ArrayList<>();
            check(alternative, value, path, errors);
            count += errors.isEmpty() ? 1 : 0;
        }
        return count;
    }

    private JsonNode resolve(String ref) {
        if (!ref.startsWith("#/")) {
            throw new IllegalArgumentException("Only local schema references are supported: " + ref);
        }
        JsonNode node = root.at(ref.substring(1));
        if (node.isMissingNode()) {
            throw new IllegalArgumentException("Unknown schema reference: " + ref);
        }
        return node;
    }

    private static boolean typeMatches(JsonNode type, JsonNode value) {
        if (type.isArray()) {
            for (JsonNode t : type) {
                if (typeMatches(t.asText(), value)) {
                    return true;
                }
            }
            return false;
        }
        return typeMatches(type.asText(), value);
    }

    private static boolean typeMatches(String type, JsonNode value) {
        return switch (type) {
            case "object" -> value.isObject();
            case "array" -> value.isArray();
            case "string" -> value.isTextual();
            case "integer" -> value.isIntegralNumber()
                    || (value.isNumber() && value.asDouble() == Math.rint(value.asDouble()));
            case "number" -> value.isNumber();
            case "boolean" -> value.isBoolean();
            case "null" -> value.isNull();
            default -> throw new IllegalArgumentException("Unknown schema type: " + type);
        };
    }

    private static String typeNames(JsonNode type) {
        if (!type.isArray()) {
            return type.asText();
        }
        List<String> names = new ArrayList<>();
        type.forEach(t -> names.add(t.asText()));
        return String.join(" or ", names);
    }

    private static boolean contains(JsonNode values, JsonNode value) {
        for (JsonNode v : values) {
            if (v.equals(value)) {
                return true;
            }
        }
        return false;
    }
}
