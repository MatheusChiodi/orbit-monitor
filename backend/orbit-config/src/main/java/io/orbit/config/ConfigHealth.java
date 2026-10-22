package io.orbit.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.privacy.SensitiveDataRedactor;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * CORE-19: state of every {@code orbit.<feature>.json} for the Settings screen: {@code missing} (not
 * created yet, not an error), {@code ok} or {@code invalid} (schema violation, unreadable file or an
 * error reported by the domain that loaded it). Messages are masked and never contain values.
 */
public class ConfigHealth {

    /** @param error masked reason when invalid, null otherwise */
    public record FileHealth(String file, String state, int items, String error) {
    }

    private static final SensitiveDataRedactor REDACTOR = new SensitiveDataRedactor();
    private final Path directory;
    private final List<ConfigFile<?>> loaded;
    private final ObjectMapper mapper = new ObjectMapper();

    public ConfigHealth(Path directory, List<ConfigFile<?>> loaded) {
        this.directory = directory;
        this.loaded = List.copyOf(loaded);
    }

    public ConfigHealth(Path directory) {
        this(directory, List.of());
    }

    public List<FileHealth> report() {
        List<FileHealth> report = new ArrayList<>();
        for (String feature : ConfigSchemas.features()) {
            report.add(check(feature));
        }
        return report;
    }

    private FileHealth check(String feature) {
        String name = "orbit." + feature + ".json";
        Path path = directory.resolve(name);
        if (!Files.exists(path)) {
            return new FileHealth(name, "missing", 0, null);
        }
        JsonNode document;
        try {
            document = mapper.readTree(Files.readAllBytes(path));
        } catch (IOException e) {
            return new FileHealth(name, "invalid", 0, "not valid JSON");
        }
        int items = document.path("items").isArray() ? document.path("items").size() : 0;
        List<String> violations = ConfigSchemas.validate(feature, document);
        if (!violations.isEmpty()) {
            return new FileHealth(name, "invalid", items, REDACTOR.redactText(String.join("; ", violations)));
        }
        Optional<String> ownerError = loaded.stream().filter(f -> f.path().getFileName().toString().equals(name))
                .map(ConfigFile::lastError).flatMap(Optional::stream).findFirst();
        return ownerError.map(e -> new FileHealth(name, "invalid", items, REDACTOR.redactText(e)))
                .orElse(new FileHealth(name, "ok", items, null));
    }
}
