package io.orbit.monitor.definition;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.OperatorName;
import io.orbit.config.ConfigFile;
import io.orbit.config.ConfigItem;
import io.orbit.config.ConfigValidationException;

import java.nio.file.Path;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * Monitor configuration owned by the Monitor domain: connections, SELECT monitors and HTTP
 * monitors, each in its own file. Cross-file rules (existing connection, unique monitor ids,
 * connection still in use) are checked here before writing.
 */
public class MonitorDefinitions {

    private final ConfigFile<ConnectionDef> connections;
    private final ConfigFile<SqlMonitorDef> selects;
    private final ConfigFile<HttpMonitorDef> requests;
    private final Clock clock;

    public MonitorDefinitions(ConfigFile<ConnectionDef> connections, ConfigFile<SqlMonitorDef> selects,
                              ConfigFile<HttpMonitorDef> requests, Clock clock) {
        this.connections = connections;
        this.selects = selects;
        this.requests = requests;
        this.clock = clock;
    }

    public static MonitorDefinitions open(Path configDir, ObjectMapper mapper) {
        return new MonitorDefinitions(
                new ConfigFile<>(configDir, "connections", ConnectionDef.class, mapper, DefinitionValidators::connections),
                new ConfigFile<>(configDir, "selects", SqlMonitorDef.class, mapper, DefinitionValidators::selects),
                new ConfigFile<>(configDir, "requests", HttpMonitorDef.class, mapper, DefinitionValidators::requests),
                Clock.systemUTC());
    }

    public List<ConnectionDef> connections() {
        return connections.items();
    }

    public Optional<ConnectionDef> connection(String id) {
        return connections.items().stream().filter(c -> c.id().equals(id)).findFirst();
    }

    public List<SqlMonitorDef> selects() {
        return selects.items();
    }

    public List<HttpMonitorDef> requests() {
        return requests.items();
    }

    public List<MonitorDef> monitors() {
        return Stream.concat(requests.items().stream(), selects.items().stream()).map(m -> (MonitorDef) m).toList();
    }

    public Optional<MonitorDef> monitor(String id) {
        return monitors().stream().filter(m -> m.id().equals(id)).findFirst();
    }

    public synchronized ConnectionDef saveConnection(ConnectionDef connection, String operator) {
        ConnectionDef stamped = connection.touchedBy(OperatorName.normalize(operator), clock.instant());
        connections.save(replace(connections.items(), stamped));
        return stamped;
    }

    public synchronized SqlMonitorDef saveSelect(SqlMonitorDef select, String operator) {
        if (connection(select.connectionId()).isEmpty()) {
            throw new ConfigValidationException(List.of(select.id() + ": unknown connection " + select.connectionId()));
        }
        requireUniqueMonitorId(select.id(), requests.items());
        SqlMonitorDef stamped = select.touchedBy(OperatorName.normalize(operator), clock.instant());
        selects.save(replace(selects.items(), stamped));
        return stamped;
    }

    public synchronized HttpMonitorDef saveRequest(HttpMonitorDef request, String operator) {
        requireUniqueMonitorId(request.id(), selects.items());
        HttpMonitorDef stamped = request.touchedBy(OperatorName.normalize(operator), clock.instant());
        requests.save(replace(requests.items(), stamped));
        return stamped;
    }

    public synchronized boolean deleteConnection(String id) {
        if (selects.items().stream().anyMatch(s -> id.equals(s.connectionId()))) {
            throw new IllegalStateException("Connection " + id + " is used by SELECT monitors");
        }
        return remove(connections, id);
    }

    public synchronized boolean deleteSelect(String id) {
        return remove(selects, id);
    }

    public synchronized boolean deleteRequest(String id) {
        return remove(requests, id);
    }

    /** Reloads files edited outside Orbit; returns true when anything changed. */
    public boolean reloadIfChanged() {
        boolean a = connections.reloadIfChanged();
        boolean b = selects.reloadIfChanged();
        boolean c = requests.reloadIfChanged();
        return a || b || c;
    }

    private static void requireUniqueMonitorId(String id, List<? extends MonitorDef> otherKind) {
        if (otherKind.stream().anyMatch(m -> m.id().equals(id))) {
            throw new ConfigValidationException(List.of(id + ": a monitor with this id already exists"));
        }
    }

    private static <T extends ConfigItem> List<T> replace(List<T> items, T item) {
        List<T> list = new ArrayList<>(items.stream().filter(i -> !i.id().equals(item.id())).toList());
        list.add(item);
        return list;
    }

    private static <T extends ConfigItem> boolean remove(ConfigFile<T> file, String id) {
        List<T> remaining = file.items().stream().filter(i -> !i.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            return false;
        }
        file.save(remaining);
        return true;
    }
}
