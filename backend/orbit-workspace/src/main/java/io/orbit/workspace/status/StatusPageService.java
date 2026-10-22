package io.orbit.workspace.status;

import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigValidator;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * BE-42: status page definitions in {@code orbit.status-pages.json}. Public pages can be read by any
 * client on the network; internal pages exist only for editors (a view-only client gets "not found",
 * so their existence is not revealed).
 */
public class StatusPageService {

    private static final Pattern ID = Pattern.compile("[a-z][a-z0-9_-]{1,63}");
    private static final Pattern SLUG = Pattern.compile("[a-z0-9][a-z0-9-]{0,39}");
    private static final int TITLE_MAX = 80;

    public static final ConfigValidator<StatusPageBuilder.StatusPage> VALIDATOR = pages -> {
        List<String> errors = new ArrayList<>();
        Set<String> slugs = new HashSet<>();
        for (StatusPageBuilder.StatusPage p : pages) {
            if (!ID.matcher(p.id()).matches()) {
                errors.add(p.id() + ": id must be lower-case letters, digits, '_' or '-'");
            }
            if (p.slug() == null || !SLUG.matcher(p.slug()).matches()) {
                errors.add(p.id() + ": slug must be lower-case letters, digits and '-'");
            } else if (!slugs.add(p.slug())) {
                errors.add(p.id() + ": slug '" + p.slug() + "' is already used");
            }
            if (p.title() == null || p.title().isBlank() || p.title().length() > TITLE_MAX) {
                errors.add(p.id() + ": title is required (up to " + TITLE_MAX + " characters)");
            }
        }
        return errors;
    };

    private final ConfigFile<StatusPageBuilder.StatusPage> file;
    private final Clock clock;

    public StatusPageService(ConfigFile<StatusPageBuilder.StatusPage> file, Clock clock) {
        this.file = file;
        this.clock = clock;
    }

    public List<StatusPageBuilder.StatusPage> list() {
        return file.items().stream().sorted(Comparator.comparing(StatusPageBuilder.StatusPage::slug)).toList();
    }

    /** Pages a client may see: every page for editors, public ones otherwise. */
    public List<StatusPageBuilder.StatusPage> visible(boolean editor) {
        return list().stream().filter(p -> editor || p.pub()).toList();
    }

    public Optional<StatusPageBuilder.StatusPage> bySlug(String slug) {
        return file.items().stream().filter(p -> p.slug().equals(slug)).findFirst();
    }

    public Optional<StatusPageBuilder.StatusPage> find(String id) {
        return file.items().stream().filter(p -> p.id().equals(id)).findFirst();
    }

    /** The rendered page for a client, empty when it does not exist or is internal and the client is not an editor. */
    public Optional<StatusPageBuilder.View> view(String slug, boolean editor,
                                                 Map<String, StatusPageBuilder.GroupInput> groups) {
        return bySlug(slug).filter(p -> editor || p.pub())
                .map(p -> StatusPageBuilder.build(p, groups, clock.instant()));
    }

    public synchronized StatusPageBuilder.StatusPage save(StatusPageBuilder.StatusPage page, String operator) {
        StatusPageBuilder.StatusPage stamped = page.stamped(OperatorName.normalize(operator), clock.instant());
        List<StatusPageBuilder.StatusPage> items = new ArrayList<>(file.items().stream()
                .filter(p -> !p.id().equals(page.id())).toList());
        items.add(stamped);
        file.save(items);
        return stamped;
    }

    public synchronized boolean delete(String id) {
        List<StatusPageBuilder.StatusPage> remaining = file.items().stream().filter(p -> !p.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }
}
