package io.orbit.history.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.history.codec.FilePermissions;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Maps stream keys (monitor ids, {@code monitorId/fieldId}) and error codes to small integers so
 * records stay a few bytes long. Persisted to {@code dictionary.json} atomically on every addition;
 * ids are never reused, so old segments always decode.
 */
public final class Dictionary {

    record Snapshot(int version, List<String> keys, List<String> errors) {
    }

    private static final ObjectMapper JSON = new ObjectMapper();

    private final Path file;
    private final List<String> keys = new ArrayList<>();
    private final List<String> errors = new ArrayList<>();
    private final Map<String, Integer> keyIds = new HashMap<>();
    private final Map<String, Integer> errorIds = new HashMap<>();

    private Dictionary(Path file) {
        this.file = file;
    }

    public static Dictionary open(Path file) throws IOException {
        Dictionary dictionary = new Dictionary(file);
        if (Files.exists(file)) {
            Snapshot snapshot = JSON.readValue(file.toFile(), Snapshot.class);
            snapshot.keys().forEach(k -> dictionary.keyIds.put(k, dictionary.add(dictionary.keys, k)));
            snapshot.errors().forEach(e -> dictionary.errorIds.put(e, dictionary.add(dictionary.errors, e) + 1));
        }
        return dictionary;
    }

    /** Id of a key, assigning and persisting a new one when unseen. */
    public synchronized int keyId(String key) throws IOException {
        Integer id = keyIds.get(key);
        if (id != null) {
            return id;
        }
        int assigned = add(keys, key);
        keyIds.put(key, assigned);
        save();
        return assigned;
    }

    public synchronized Optional<Integer> findKey(String key) {
        return Optional.ofNullable(keyIds.get(key));
    }

    /** Error code id (0 = no error), assigning a new one when unseen. */
    public synchronized int errorId(String error) throws IOException {
        if (error == null || error.isBlank()) {
            return 0;
        }
        Integer id = errorIds.get(error);
        if (id != null) {
            return id;
        }
        int assigned = add(errors, error) + 1;
        errorIds.put(error, assigned);
        save();
        return assigned;
    }

    public synchronized String error(int id) {
        return id <= 0 || id > errors.size() ? null : errors.get(id - 1);
    }

    private int add(List<String> list, String value) {
        list.add(value);
        return list.size() - 1;
    }

    private void save() throws IOException {
        Files.createDirectories(file.getParent());
        Path tmp = file.resolveSibling(file.getFileName() + AtomicFiles.TMP);
        JSON.writeValue(tmp.toFile(), new Snapshot(1, keys, errors));
        FilePermissions.ownerOnly(tmp);
        AtomicFiles.move(tmp, file);
    }
}
