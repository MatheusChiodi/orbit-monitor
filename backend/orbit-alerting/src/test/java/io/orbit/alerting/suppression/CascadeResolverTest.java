package io.orbit.alerting.suppression;

import io.orbit.alerting.InMemoryIncidentRepository;
import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("BE-30 dependencies from orbit.dependencies.json collapse downstream incidents")
class CascadeResolverTest {

    private static final Instant T0 = Instant.parse("2026-10-18T12:00:00Z");
    private final Map<String, String> groups = Map.of("bus_api", "grp_bus", "bus_queue", "grp_bus",
            "portal", "grp_web", "checkout", "grp_web");
    private IncidentService incidents;
    private List<Dependency> dependencies;

    @BeforeEach
    void setUp() {
        incidents = new IncidentService(new InMemoryIncidentRepository(), id -> false, i -> { },
                Clock.fixed(T0, ZoneOffset.UTC), Duration.ofMinutes(5));
        dependencies = List.of(new Dependency("dep_1", "grp_bus", "portal", null),
                new Dependency("dep_2", "portal", "checkout", "Checkout calls the portal"));
        CascadeResolver resolver = new CascadeResolver(() -> DependencyGraph.of(dependencies),
                id -> Optional.ofNullable(groups.get(id)),
                group -> groups.entrySet().stream().filter(e -> e.getValue().equals(group)).map(Map.Entry::getKey)
                        .sorted().toList(),
                incidents::openIncident);
        incidents.setUpstream(resolver::upstreamIncident);
    }

    private void down(String monitor) {
        incidents.onStateChanged(new MonitorStateChanged(monitor, MonitorState.OK, MonitorState.DOWN, T0, T0));
    }

    @Test
    @DisplayName("a monitor whose upstream group has a down monitor joins that incident")
    void groupUpstream() {
        down("bus_queue");
        down("portal");
        String root = incidents.openIncident("bus_queue").orElseThrow().id();
        assertThat(incidents.openIncident("portal").orElseThrow().parentId()).isEqualTo(root);
    }

    @Test
    @DisplayName("a chain collapses into the root incident")
    void chain() {
        down("bus_api");
        down("portal");
        down("checkout");
        String root = incidents.openIncident("bus_api").orElseThrow().id();
        assertThat(incidents.openIncident("checkout")).map(Incident::parentId).contains(root);
    }

    @Test
    @DisplayName("without a down upstream the incident stands alone")
    void independent() {
        down("checkout");
        assertThat(incidents.openIncident("checkout").orElseThrow().parentId()).isNull();
    }

    @Test
    @DisplayName("graphs built from the file reject cycles")
    void cyclesRejected() {
        assertThatThrownBy(() -> DependencyGraph.of(List.of(new Dependency("a", "x", "y", null),
                new Dependency("b", "y", "x", null)))).isInstanceOf(IllegalArgumentException.class);
        assertThat(DependencyGraph.of(dependencies).upstreamsOf("checkout")).containsExactly("portal");
        assertThat(DependencyGraph.of(dependencies).edges()).hasSize(2);
    }
}
