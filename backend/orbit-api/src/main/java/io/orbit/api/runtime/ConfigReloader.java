package io.orbit.api.runtime;

import io.orbit.config.ConfigFile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * CORE-19: picks up external edits (and imports) of every config file registered as a bean. A file
 * that became invalid keeps serving its last valid copy and reports the error (ConfigFile).
 */
@Component
public class ConfigReloader {

    private final List<ConfigFile<?>> files;

    public ConfigReloader(List<ConfigFile<?>> files) {
        this.files = List.copyOf(files);
    }

    /** Reloads changed files; returns the names of the files that now serve new content. */
    @Scheduled(fixedDelay = 5_000)
    public List<String> reloadChanged() {
        return files.stream().filter(ConfigFile::reloadIfChanged).map(f -> f.path().getFileName().toString()).toList();
    }
}
