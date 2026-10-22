package io.orbit.alerting.suppression;

import io.orbit.alerting.Incident;
import io.orbit.common.MonitorState;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * BE-30: finds the open upstream incident a monitor's new incident collapses into. A monitor's nodes are
 * its own id and its group; an upstream node that is a group counts when any of its monitors has an
 * open DOWN incident. A chain resolves to the root incident.
 */
public class CascadeResolver {

    private final Supplier<DependencyGraph> graph;
    private final Function<String, Optional<String>> groupOfMonitor;
    private final Function<String, List<String>> monitorsOfGroup;
    private final Function<String, Optional<Incident>> openIncidentOfMonitor;

    public CascadeResolver(Supplier<DependencyGraph> graph, Function<String, Optional<String>> groupOfMonitor,
                           Function<String, List<String>> monitorsOfGroup,
                           Function<String, Optional<Incident>> openIncidentOfMonitor) {
        this.graph = graph;
        this.groupOfMonitor = groupOfMonitor;
        this.monitorsOfGroup = monitorsOfGroup;
        this.openIncidentOfMonitor = openIncidentOfMonitor;
    }

    /** Id of the open upstream (root) incident for {@code monitorId}; empty when nothing upstream is down. */
    public Optional<String> upstreamIncident(String monitorId) {
        DependencyGraph current = graph.get();
        List<String> nodes = new ArrayList<>(List.of(monitorId));
        groupOfMonitor.apply(monitorId).ifPresent(nodes::add);
        for (String node : nodes) {
            for (String upstream : current.upstreamsOf(node)) {
                Optional<String> found = downIncident(upstream, monitorId);
                if (found.isPresent()) {
                    return found;
                }
            }
        }
        return Optional.empty();
    }

    private Optional<String> downIncident(String node, String self) {
        List<String> candidates = new ArrayList<>(List.of(node));
        candidates.addAll(monitorsOfGroup.apply(node));
        return candidates.stream()
                .filter(m -> !m.equals(self))
                .map(openIncidentOfMonitor)
                .flatMap(Optional::stream)
                .filter(i -> i.isOpen() && i.severity() == MonitorState.DOWN)
                .map(i -> i.parentId() != null ? i.parentId() : i.id())
                .findFirst();
    }
}
