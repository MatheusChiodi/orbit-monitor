package io.orbit.workspace.layout;

import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidationException;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

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
        public Layout {
            blocks = blocks == null ? List.of() : List.copyOf(blocks);
        }
    }

    public static final String DEFAULT_SLUG = "noc";
    private static final int COLUMNS = 12;
    private static final Pattern SLUG = Pattern.compile("[a-z0-9][a-z0-9-]{0,39}");

    private final ConfigFile<Layout> file;
    private final Clock clock;

    public WallLayoutService(ConfigFile<Layout> file, Clock clock) {
        this.file = file;
        this.clock = clock;
    }

    /** Saves a new version; the slug must be unique and URL-safe, blocks must fit the 12-column grid. */
    public synchronized Layout save(Layout layout, String operator) {
        List<String> errors = validate(layout);
        if (!errors.isEmpty()) {
            throw new ConfigValidationException(errors);
        }
        int version = file.items().stream().filter(l -> l.id().equals(layout.id())).mapToInt(Layout::version)
                .max().orElse(0) + 1;
        Layout stamped = new Layout(layout.id(), layout.slug(), layout.name(), version, layout.blocks(),
                clock.instant(), OperatorName.normalize(operator));
        List<Layout> items = new ArrayList<>(file.items().stream().filter(l -> !l.id().equals(layout.id())).toList());
        items.add(stamped);
        file.save(items);
        return stamped;
    }

    public Optional<Layout> bySlug(String slug) {
        return file.items().stream().filter(l -> l.slug().equals(slug)).findFirst();
    }

    public List<Layout> list() {
        return file.items();
    }

    public synchronized boolean delete(String id) {
        List<Layout> remaining = file.items().stream().filter(l -> !l.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }

    /** The built-in {@code noc} layout when none is configured: the prototype wall. */
    public Layout defaultLayout() {
        return new Layout("lay_noc", DEFAULT_SLUG, "NOC", 0, List.of(
                new Block("hero", 0, 0, 8, 6, null, null, null),
                new Block("also-active", 8, 0, 4, 3, null, null, null),
                new Block("near-limit", 8, 3, 4, 3, null, null, null),
                new Block("matrix", 0, 6, 8, 4, null, null, null),
                new Block("timeline", 8, 6, 4, 4, null, null, null)), null, null);
    }

    /** The configured layout for the slug, or the built-in one for {@code noc}. */
    public Optional<Layout> resolve(String slug) {
        Optional<Layout> configured = bySlug(slug == null ? DEFAULT_SLUG : slug);
        if (configured.isPresent() || slug != null && !slug.equals(DEFAULT_SLUG)) {
            return configured;
        }
        return Optional.of(defaultLayout());
    }

    private List<String> validate(Layout layout) {
        List<String> errors = new ArrayList<>();
        if (layout.slug() == null || !SLUG.matcher(layout.slug()).matches()) {
            errors.add(layout.id() + ": slug must be lower-case letters, digits and '-'");
        } else if (file.items().stream().anyMatch(l -> l.slug().equals(layout.slug()) && !l.id().equals(layout.id()))) {
            errors.add(layout.id() + ": slug '" + layout.slug() + "' is already used");
        }
        for (Block b : layout.blocks()) {
            if (b.type() == null || b.x() < 0 || b.y() < 0 || b.w() < 1 || b.h() < 1 || b.x() + b.w() > COLUMNS) {
                errors.add(layout.id() + ": block " + b.type() + " must fit the 12-column grid");
            }
        }
        return errors;
    }
}
