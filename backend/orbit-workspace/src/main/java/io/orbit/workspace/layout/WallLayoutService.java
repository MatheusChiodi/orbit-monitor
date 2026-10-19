package io.orbit.workspace.layout;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * BE-41: wall layouts addressed by slug ({@code /wall/noc}), versioned on every save, stored in
 * orbit.layouts.json. View clients only read them; there is no wall token.
 */
public class WallLayoutService {

    /** A block on the 12-column grid. */
    public record Block(String type, int x, int y, int w, int h, String source, String field, String display) {
    }

    public record Layout(String id, String slug, String name, int version, List<Block> blocks, Instant updatedAt,
                         String updatedBy) implements ConfigItem {
    }

    public WallLayoutService(ConfigFile<Layout> file, Clock clock) {
    }

    /** Saves a new version; the slug must be unique and URL-safe, blocks must fit the 12-column grid. */
    public Layout save(Layout layout, String operator) {
        throw new UnsupportedOperationException("BE-41 wall layouts are not implemented yet");
    }

    public Optional<Layout> bySlug(String slug) {
        throw new UnsupportedOperationException("BE-41 wall layouts are not implemented yet");
    }

    /** The built-in {@code noc} layout when none is configured. */
    public Layout defaultLayout() {
        throw new UnsupportedOperationException("BE-41 wall layouts are not implemented yet");
    }
}
