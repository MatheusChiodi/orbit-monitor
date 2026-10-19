package io.orbit.monitor.definition;

import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** BE-12: saved, reusable SELECTs per connection (orbit.query-catalog.json), with owner and description. */
public class QueryCatalog {

    public record SavedQuery(String id, String name, String connectionId, String sql, String owner,
                             String description, Instant updatedAt, String updatedBy) implements ConfigItem {
    }

    public QueryCatalog(ConfigFile<SavedQuery> file, MonitorDefinitions definitions, Clock clock) {
    }

    public SavedQuery save(SavedQuery query, String operator) {
        throw new UnsupportedOperationException("BE-12 query catalog is not implemented yet");
    }

    public List<SavedQuery> byConnection(String connectionId) {
        throw new UnsupportedOperationException("BE-12 query catalog is not implemented yet");
    }

    public Optional<SavedQuery> find(String id) {
        throw new UnsupportedOperationException("BE-12 query catalog is not implemented yet");
    }

    public boolean delete(String id) {
        throw new UnsupportedOperationException("BE-12 query catalog is not implemented yet");
    }
}
