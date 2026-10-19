package io.orbit.alerting.suppression;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("pending")
@DisplayName("BE-30 cascade suppression")
class DependencyGraphTest {

    private final DependencyGraph graph = new DependencyGraph();

    @BeforeEach
    void setUp() {
        graph.addDependency("bus", "auth");
        graph.addDependency("auth", "portal");
        graph.addDependency("auth", "checkout");
    }

    @Test
    @DisplayName("impact covers transitive dependents")
    void impact() {
        assertThat(graph.impactOf("bus")).containsExactlyInAnyOrder("auth", "portal", "checkout");
        assertThat(graph.impactOf("portal")).isEmpty();
    }

    @Test
    @DisplayName("downstream failures collapse into the upstream root cause")
    void rootCause() {
        Set<String> down = Set.of("bus", "auth", "portal", "checkout");
        assertThat(graph.rootCauses(down)).containsExactly("bus");
        assertThat(graph.isSuppressed("portal", down)).isTrue();
        assertThat(graph.isSuppressed("bus", down)).isFalse();
    }

    @Test
    @DisplayName("an independent failure is its own root cause")
    void independent() {
        assertThat(graph.rootCauses(Set.of("portal"))).containsExactly("portal");
    }

    @Test
    @DisplayName("cycles are rejected")
    void cycles() {
        assertThatThrownBy(() -> graph.addDependency("checkout", "bus")).isInstanceOf(IllegalArgumentException.class);
    }
}
