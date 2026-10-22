package io.orbit.api.web;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.alerting.suppression.Dependency;
import io.orbit.alerting.suppression.DependencyGraph;
import io.orbit.common.MonitorState;
import io.orbit.config.ConfigFile;
import io.orbit.monitor.definition.MonitorDef;
import io.orbit.monitor.definition.MonitorDefinitions;
import io.orbit.security.audit.AuditLog;
import io.orbit.telemetry.TelemetryService;
import io.orbit.workspace.Group;
import io.orbit.workspace.GroupService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/** BE-30: dependencies between monitors and groups (orbit.dependencies.json) and the graph for the console. */
@RestController
@RequestMapping("/api/dependencies")
public class DependencyController {

    public record DependencyRequest(String upstream, String downstream, String note) {
    }

    /** @param kind MONITOR, GROUP or UNKNOWN (an id that is not registered); status OK, WARN, DOWN or UNKNOWN */
    public record NodeView(String id, String kind, String name, String status) {
    }

    public record EdgeView(String id, String upstream, String downstream, String note) {
    }

    /** @param rootCauses down nodes without a down upstream (the incidents everything else collapses into) */
    public record GraphView(List<NodeView> nodes, List<EdgeView> edges, List<String> rootCauses) {
    }

    public record ImpactView(String node, List<String> impacted) {
    }

    private final ConfigFile<Dependency> file;
    private final MonitorDefinitions definitions;
    private final GroupService groups;
    private final TelemetryService telemetry;
    private final IncidentService incidents;
    private final AuditLog audit;

    public DependencyController(ConfigFile<Dependency> file, MonitorDefinitions definitions, GroupService groups,
                                TelemetryService telemetry, IncidentService incidents, AuditLog audit) {
        this.file = file;
        this.definitions = definitions;
        this.groups = groups;
        this.telemetry = telemetry;
        this.incidents = incidents;
        this.audit = audit;
    }

    @GetMapping
    public List<Dependency> list() {
        return file.items();
    }

    @GetMapping("/graph")
    public GraphView graph() {
        List<Dependency> edges = file.items();
        Set<String> ids = new LinkedHashSet<>();
        edges.forEach(d -> {
            ids.add(d.upstream());
            ids.add(d.downstream());
        });
        List<NodeView> nodes = ids.stream().map(this::node).toList();
        Set<String> down = new HashSet<>();
        nodes.stream().filter(n -> MonitorState.DOWN.name().equals(n.status())).map(NodeView::id).forEach(down::add);
        return new GraphView(nodes,
                edges.stream().map(d -> new EdgeView(d.id(), d.upstream(), d.downstream(), d.note())).toList(),
                List.copyOf(DependencyGraph.of(edges).rootCauses(down)));
    }

    @GetMapping("/impact/{node}")
    public ImpactView impact(@PathVariable String node) {
        return new ImpactView(node, List.copyOf(DependencyGraph.of(file.items()).impactOf(node)));
    }

    @PutMapping("/{id}")
    public synchronized Dependency save(@PathVariable String id, @RequestBody DependencyRequest body,
                                        HttpServletRequest request) {
        String operator = Actors.current();
        Dependency dependency = new Dependency(id, trim(body.upstream()), trim(body.downstream()), body.note());
        List<Dependency> items = new ArrayList<>(file.items().stream().filter(d -> !d.id().equals(id)).toList());
        items.add(dependency);
        file.save(items);
        audit.record(operator, "dependency.save", id, dependency.upstream() + " -> " + dependency.downstream(),
                request.getRemoteAddr());
        return dependency;
    }

    @DeleteMapping("/{id}")
    public synchronized ResponseEntity<Void> delete(@PathVariable String id,
                                                    HttpServletRequest request) {
        String operator = Actors.current();
        List<Dependency> remaining = file.items().stream().filter(d -> !d.id().equals(id)).toList();
        if (remaining.size() == file.items().size()) {
            throw new NotFoundException("Dependency", id);
        }
        file.save(remaining);
        audit.record(operator, "dependency.delete", id, null, request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private NodeView node(String id) {
        Optional<MonitorDef> monitor = definitions.monitor(id);
        if (monitor.isPresent()) {
            return new NodeView(id, "MONITOR", monitor.get().name(), monitorState(id).name());
        }
        Optional<Group> group = groups.find(id);
        if (group.isPresent()) {
            List<String> members = definitions.monitors().stream().filter(m -> id.equals(m.groupId()))
                    .map(MonitorDef::id).toList();
            return new NodeView(id, "GROUP", group.get().name(), GroupService.stateOf(members, this::monitorState).name());
        }
        return new NodeView(id, "UNKNOWN", id, monitorState(id).name());
    }

    /** Confirmed state, or DOWN while the monitor has an open DOWN incident. */
    private MonitorState monitorState(String monitorId) {
        boolean downIncident = incidents.openIncident(monitorId).map(Incident::severity)
                .filter(s -> s == MonitorState.DOWN).isPresent();
        return downIncident ? MonitorState.DOWN : telemetry.currentState(monitorId);
    }

    private static String trim(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("upstream and downstream are required");
        }
        return value.strip();
    }
}
