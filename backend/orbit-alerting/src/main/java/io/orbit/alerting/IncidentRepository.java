package io.orbit.alerting;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Storage port for incidents; the local runtime keeps them in memory only. */
public interface IncidentRepository {

    void save(Incident incident);

    Optional<Incident> findById(String id);

    Optional<Incident> findOpenByMonitor(String monitorId);

    Optional<Incident> findLatestByMonitor(String monitorId);

    /** All incidents, newest first. */
    List<Incident> findAll();

    void deleteResolvedBefore(Instant cutoff);
}
