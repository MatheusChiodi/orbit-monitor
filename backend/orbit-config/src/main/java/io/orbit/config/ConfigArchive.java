package io.orbit.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * BE-37: export every {@code orbit.<feature>.json} as one zip with secrets omitted, and import it back
 * with a dry-run diff before anything is written.
 */
public class ConfigArchive {

    /** One file of the import, compared with what is on disk. */
    public record FileChange(String file, List<String> added, List<String> changed, List<String> removed) {
    }

    static final Pattern CONFIG_FILE = Pattern.compile("orbit\\.[a-z][a-z0-9-]{0,40}\\.json");
    private static final int MAX_ENTRIES = 64;
    private static final int MAX_ENTRY_BYTES = 8 * 1024 * 1024;

    private final Path configDir;
    private final ObjectMapper mapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

    public ConfigArchive(Path configDir) {
        this.configDir = configDir;
    }

    /** Zip of the config files; every {@code {"enc": ...}} secret is replaced by {@code null}. */
    public byte[] export() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out); Stream<Path> files = listConfigFiles()) {
            for (Path file : files.toList()) {
                JsonNode document = mapper.readTree(Files.readAllBytes(file));
                zip.putNextEntry(new ZipEntry(file.getFileName().toString()));
                zip.write(mapper.writeValueAsBytes(withoutSecrets(document)));
                zip.closeEntry();
            }
        } catch (IOException e) {
            throw new ConfigStorageException("Could not export the configuration", e);
        }
        return out.toByteArray();
    }

    /** Item ids added, changed or removed per file; nothing is written. */
    public List<FileChange> diff(byte[] archive) {
        List<FileChange> changes = new ArrayList<>();
        read(archive).forEach((name, incoming) -> {
            JsonNode current = current(name);
            changes.add(compare(name, current.path("items"), withSecretsFrom(incoming, current).path("items")));
        });
        return changes;
    }

    /**
     * Writes the archive's files (each validated by its owner on reload); secrets missing from the
     * archive keep their current value. Non-config entries and path traversal are rejected.
     */
    public List<FileChange> apply(byte[] archive) {
        Map<String, JsonNode> files = read(archive);
        List<FileChange> changes = new ArrayList<>();
        try {
            Files.createDirectories(configDir);
            for (Map.Entry<String, JsonNode> file : files.entrySet()) {
                JsonNode current = current(file.getKey());
                JsonNode merged = withSecretsFrom(file.getValue(), current);
                changes.add(compare(file.getKey(), current.path("items"), merged.path("items")));
                AtomicFiles.write(configDir.resolve(file.getKey()), mapper.writeValueAsBytes(merged));
            }
        } catch (IOException e) {
            throw new ConfigStorageException("Could not import the configuration", e);
        }
        return changes;
    }

    private Stream<Path> listConfigFiles() throws IOException {
        if (!Files.isDirectory(configDir)) {
            return Stream.empty();
        }
        return Files.list(configDir).filter(Files::isRegularFile)
                .filter(p -> CONFIG_FILE.matcher(p.getFileName().toString()).matches()).sorted();
    }

    /** Parses and checks every entry before anything else happens. */
    private Map<String, JsonNode> read(byte[] archive) {
        Map<String, JsonNode> files = new TreeMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive))) {
            for (ZipEntry entry; (entry = zip.getNextEntry()) != null; ) {
                String name = entry.getName();
                if (entry.isDirectory() || !CONFIG_FILE.matcher(name).matches()) {
                    throw new IllegalArgumentException("Not a configuration file: " + printable(name));
                }
                if (files.containsKey(name) || files.size() >= MAX_ENTRIES) {
                    throw new IllegalArgumentException("Duplicate or too many entries in the archive");
                }
                files.put(name, document(name, limited(zip)));
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Not a valid configuration archive", e);
        }
        if (files.isEmpty()) {
            throw new IllegalArgumentException("The archive contains no configuration files");
        }
        return files;
    }

    private JsonNode document(String name, byte[] bytes) {
        try {
            JsonNode document = mapper.readTree(bytes);
            if (document == null || !document.isObject() || !document.path("version").isInt()
                    || !document.path("items").isArray()) {
                throw new IllegalArgumentException(name + ": expected {\"version\": n, \"items\": [...]}");
            }
            for (JsonNode item : document.get("items")) {
                if (!item.path("id").isTextual()) {
                    throw new IllegalArgumentException(name + ": every item needs a text id");
                }
            }
            return document;
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException(name + ": invalid JSON");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static byte[] limited(InputStream in) throws IOException {
        byte[] bytes = in.readNBytes(MAX_ENTRY_BYTES + 1);
        if (bytes.length > MAX_ENTRY_BYTES) {
            throw new IllegalArgumentException("Archive entry too large");
        }
        return bytes;
    }

    private JsonNode current(String name) {
        Path file = configDir.resolve(name);
        try {
            return Files.exists(file) ? mapper.readTree(Files.readAllBytes(file)) : mapper.createObjectNode();
        } catch (IOException e) {
            return mapper.createObjectNode();
        }
    }

    private static FileChange compare(String name, JsonNode before, JsonNode after) {
        Map<String, JsonNode> old = byId(before);
        Map<String, JsonNode> now = byId(after);
        List<String> added = new ArrayList<>();
        List<String> changed = new ArrayList<>();
        now.forEach((id, item) -> {
            if (!old.containsKey(id)) {
                added.add(id);
            } else if (!old.get(id).equals(item)) {
                changed.add(id);
            }
        });
        List<String> removed = old.keySet().stream().filter(id -> !now.containsKey(id)).toList();
        return new FileChange(name, added, changed, removed);
    }

    private static Map<String, JsonNode> byId(JsonNode items) {
        Map<String, JsonNode> map = new LinkedHashMap<>();
        items.forEach(item -> map.put(item.path("id").asText(), item));
        return map;
    }

    /** Copy of the document where every encrypted secret is null. */
    static JsonNode withoutSecrets(JsonNode node) {
        if (isEncrypted(node)) {
            return NullNode.getInstance();
        }
        if (node.isObject()) {
            ObjectNode copy = ((ObjectNode) node).objectNode();
            node.fields().forEachRemaining(f -> copy.set(f.getKey(), withoutSecrets(f.getValue())));
            return copy;
        }
        if (node.isArray()) {
            ArrayNode copy = ((ArrayNode) node).arrayNode();
            node.forEach(child -> copy.add(withoutSecrets(child)));
            return copy;
        }
        return node;
    }

    /** Copy of the incoming document where omitted (null) secrets take the current item's value. */
    private static JsonNode withSecretsFrom(JsonNode incoming, JsonNode current) {
        JsonNode copy = incoming.deepCopy();
        Map<String, JsonNode> existing = byId(current.path("items"));
        for (JsonNode item : copy.path("items")) {
            JsonNode previous = existing.get(item.path("id").asText());
            if (previous != null) {
                restoreSecrets((ObjectNode) item, previous);
            }
        }
        return copy;
    }

    private static void restoreSecrets(ObjectNode target, JsonNode previous) {
        Iterator<Map.Entry<String, JsonNode>> fields = previous.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            JsonNode value = target.get(field.getKey());
            if (isEncrypted(field.getValue()) && (value == null || value.isNull())) {
                target.set(field.getKey(), field.getValue().deepCopy());
            } else if (field.getValue().isObject() && value != null && value.isObject()) {
                restoreSecrets((ObjectNode) value, field.getValue());
            }
        }
    }

    private static boolean isEncrypted(JsonNode node) {
        return node.isObject() && node.size() == 1 && node.path("enc").isTextual();
    }

    private static String printable(String name) {
        String cleaned = name.replaceAll("[^A-Za-z0-9._/-]", "?");
        return cleaned.length() > 80 ? cleaned.substring(0, 80) + "…" : cleaned;
    }
}
