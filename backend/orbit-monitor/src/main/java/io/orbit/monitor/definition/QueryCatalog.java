package io.orbit.monitor.definition;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidationException;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** BE-12: saved, reusable SELECTs per connection (orbit.query-catalog.json), with owner and description. */
public class QueryCatalog {

    public record SavedQuery(String id, String name, String connectionId, String sql, String owner,
                             String description, Instant updatedAt, String updatedBy) implements ConfigItem {

        SavedQuery touchedBy(String operator, Instant at) {
            return new SavedQuery(id, name, connectionId, sql, owner, description, at, operator);
        }
    }

    private final ConfigFile<SavedQuery> file;
    private final MonitorDefinitions definitions;
    private final Clock clock;

    public QueryCatalog(ConfigFile<SavedQuery> file, MonitorDefinitions definitions, Clock clock) {
        this.file = file;
        this.definitions = definitions;
        this.clock = clock;
    }

    /** The catalog stored in {@code <configDir>/orbit.query-catalog.json}, validated on read and write. */
    public static QueryCatalog open(Path configDir, ObjectMapper mapper, MonitorDefinitions definitions) {
        return new QueryCatalog(new ConfigFile<>(configDir, "query-catalog", SavedQuery.class, mapper,
                DefinitionValidators::savedQueries), definitions, Clock.systemUTC());
    }

    /**
     * Validates (safe SELECT, id, name) and checks that the connection exists, then stamps the
     * operator and time and writes the file. Throws {@link ConfigValidationException} when invalid.
     */
    public synchronized SavedQuery save(SavedQuery query, String operator) {
        List<String> errors = new ArrayList<>(DefinitionValidators.savedQueries(List.of(query)));
        if (query.connectionId() != null && definitions.connection(query.connectionId()).isEmpty()) {
            errors.add(query.id() + ": unknown connection " + query.connectionId());
        }
        if (!errors.isEmpty()) {
            throw new ConfigValidationException(errors);
        }
        SavedQuery stamped = query.touchedBy(OperatorName.normalize(operator), clock.instant());
        List<SavedQuery> items = new ArrayList<>(file.items().stream()
                .filter(q -> !q.id().equals(query.id())).toList());
        items.add(stamped);
        file.save(items);
        return stamped;
    }

    public List<SavedQuery> all() {
        return file.items();
    }

    /** Saved queries of one connection, sorted by name. */
    public List<SavedQuery> byConnection(String connectionId) {
        return file.items().stream()
                .filter(q -> q.connectionId() != null && q.connectionId().equals(connectionId))
                .sorted(Comparator.comparing(SavedQuery::name, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    public Optional<SavedQuery> find(String id) {
        return file.items().stream().filter(q -> q.id().equals(id)).findFirst();
    }

    public synchronized boolean delete(String id) {
        List<SavedQuery> remaining = file.items().stream().filter(q -> !q.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }

    /** Reloads a file edited outside Orbit; returns true when it changed. */
    public boolean reloadIfChanged() {
        return file.reloadIfChanged();
    }
}
