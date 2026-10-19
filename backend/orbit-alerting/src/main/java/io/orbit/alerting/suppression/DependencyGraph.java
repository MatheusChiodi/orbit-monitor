package io.orbit.alerting.suppression;

import java.util.Set;

/**
 * BE-30: dependencies between monitors/groups (orbit.dependencies.json). When an upstream node is
 * down, its downstream alerts collapse into the upstream incident ("blast radius").
 */
public class DependencyGraph {

    /** Declares that {@code downstream} depends on {@code upstream}; cycles are rejected. */
    public void addDependency(String upstream, String downstream) {
        throw new UnsupportedOperationException("BE-30 cascade suppression is not implemented yet");
    }

    /** Everything that depends on {@code node}, directly or transitively. */
    public Set<String> impactOf(String node) {
        throw new UnsupportedOperationException("BE-30 cascade suppression is not implemented yet");
    }

    /** Down nodes that are not explained by another down node upstream. */
    public Set<String> rootCauses(Set<String> down) {
        throw new UnsupportedOperationException("BE-30 cascade suppression is not implemented yet");
    }

    /** True when an upstream dependency of {@code node} is also down. */
    public boolean isSuppressed(String node, Set<String> down) {
        throw new UnsupportedOperationException("BE-30 cascade suppression is not implemented yet");
    }
}
