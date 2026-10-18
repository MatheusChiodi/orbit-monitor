package io.orbit.alerting;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/** Incidents in memory; lost on restart (docs/06 section 7). */
public class InMemoryIncidentRepository implements IncidentRepository {

    private static final Comparator<Incident> NEWEST_FIRST =
            Comparator.comparing(Incident::openedAt).reversed().thenComparing(Incident::id, Comparator.reverseOrder());

    private final Map<String, Incident> incidents = new ConcurrentHashMap<>();

    @Override
    public void save(Incident incident) {
        incidents.put(incident.id(), incident);
    }

    @Override
    public Optional<Incident> findById(String id) {
        return Optional.ofNullable(incidents.get(id));
    }

    @Override
    public Optional<Incident> findOpenByMonitor(String monitorId) {
        return incidents.values().stream().filter(i -> i.monitorId().equals(monitorId) && i.isOpen()).findFirst();
    }

    @Override
    public Optional<Incident> findLatestByMonitor(String monitorId) {
        return incidents.values().stream().filter(i -> i.monitorId().equals(monitorId)).sorted(NEWEST_FIRST).findFirst();
    }

    @Override
    public List<Incident> findAll() {
        return incidents.values().stream().sorted(NEWEST_FIRST).toList();
    }

    @Override
    public void deleteResolvedBefore(Instant cutoff) {
        incidents.values().removeIf(i -> !i.isOpen() && i.resolvedAt().isBefore(cutoff));
    }
}
