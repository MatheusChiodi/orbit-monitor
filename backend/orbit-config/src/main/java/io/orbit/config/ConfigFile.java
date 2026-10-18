package io.orbit.config;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * One {@code orbit.<feature>.json} file (docs/06-configuration-files.md): a versioned list of items,
 * validated on read and write, written atomically (tmp + rename) with the previous copy kept as
 * {@code .bak}. An invalid file on disk is never overwritten by a reload: the last valid copy keeps
 * serving and the error is exposed through {@link #lastError()}.
 */
public class ConfigFile<T extends ConfigItem> {

    public static final int CURRENT_VERSION = 1;
    private static final Pattern FEATURE = Pattern.compile("[a-z][a-z0-9-]{0,40}");

    private final Path path;
    private final ObjectMapper mapper;
    private final JavaType listType;
    private final ConfigValidator<T> validator;
    private List<T> items = List.of();
    private FileTime loadedModifiedTime;
    private String lastError;

    public ConfigFile(Path directory, String feature, Class<T> itemType, ObjectMapper mapper,
                      ConfigValidator<T> validator) {
        if (!FEATURE.matcher(feature).matches()) {
            throw new IllegalArgumentException("Invalid feature name: " + feature);
        }
        this.path = directory.resolve("orbit." + feature + ".json");
        this.mapper = mapper;
        this.listType = mapper.getTypeFactory().constructCollectionType(List.class, itemType);
        this.validator = validator;
        if (Files.exists(path)) {
            load();
        }
    }

    public Path path() {
        return path;
    }

    public synchronized List<T> items() {
        return items;
    }

    public synchronized Optional<String> lastError() {
        return Optional.ofNullable(lastError);
    }

    /** Validates and atomically replaces the file; throws {@link ConfigValidationException} when invalid. */
    public synchronized void save(List<T> newItems) {
        List<String> errors = validate(newItems);
        if (!errors.isEmpty()) {
            throw new ConfigValidationException(errors);
        }
        try {
            Files.createDirectories(path.getParent());
            ObjectNode document = mapper.createObjectNode();
            document.put("version", CURRENT_VERSION);
            document.set("items", mapper.valueToTree(newItems));
            writeAtomically(mapper.writeValueAsBytes(document));
            items = List.copyOf(newItems);
            loadedModifiedTime = Files.getLastModifiedTime(path);
            lastError = null;
        } catch (IOException e) {
            throw new ConfigStorageException("Could not write " + path.getFileName(), e);
        }
    }

    /** Reloads after an external edit; returns true when new valid content was applied. */
    public synchronized boolean reloadIfChanged() {
        try {
            if (!Files.exists(path)) {
                return false;
            }
            FileTime modified = Files.getLastModifiedTime(path);
            if (modified.equals(loadedModifiedTime)) {
                return false;
            }
            return load();
        } catch (IOException e) {
            lastError = "Could not read " + path.getFileName() + ": " + e.getMessage();
            return false;
        }
    }

    private boolean load() {
        try {
            FileTime modified = Files.getLastModifiedTime(path);
            JsonNode document = mapper.readTree(Files.readAllBytes(path));
            int version = document.path("version").asInt(-1);
            if (version != CURRENT_VERSION) {
                throw new IOException("Unsupported version " + version + " (expected " + CURRENT_VERSION + ")");
            }
            List<T> parsed = mapper.convertValue(document.path("items"), listType);
            List<T> loaded = parsed == null ? List.of() : parsed;
            List<String> errors = validate(loaded);
            loadedModifiedTime = modified;
            if (!errors.isEmpty()) {
                lastError = String.join("; ", errors);
                return false;
            }
            items = List.copyOf(loaded);
            lastError = null;
            return true;
        } catch (IOException | IllegalArgumentException e) {
            lastError = "Invalid " + path.getFileName() + ": " + e.getMessage();
            try {
                loadedModifiedTime = Files.getLastModifiedTime(path);
            } catch (IOException ignored) {
                // keep the previous timestamp; the next reload retries
            }
            return false;
        }
    }

    private List<String> validate(List<T> candidate) {
        List<String> errors = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (T item : candidate) {
            if (item.id() == null || item.id().isBlank()) {
                errors.add("item without id");
            } else if (!ids.add(item.id())) {
                errors.add("duplicate id: " + item.id());
            }
        }
        if (errors.isEmpty()) {
            errors.addAll(validator.validate(candidate));
        }
        return errors;
    }

    private void writeAtomically(byte[] content) throws IOException {
        Path tmp = path.resolveSibling(path.getFileName() + ".tmp");
        try (FileChannel channel = FileChannel.open(tmp, StandardOpenOption.CREATE, StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING)) {
            channel.write(ByteBuffer.wrap(content));
            channel.force(true);
        }
        restrictToOwner(tmp);
        if (Files.exists(path)) {
            Files.copy(path, path.resolveSibling(path.getFileName() + ".bak"), StandardCopyOption.REPLACE_EXISTING);
        }
        try {
            Files.move(tmp, path, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (AtomicMoveNotSupportedException e) {
            Files.move(tmp, path, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static void restrictToOwner(Path file) {
        try {
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        } catch (UnsupportedOperationException | IOException e) {
            // Windows: the user profile directory already limits access
        }
    }
}
