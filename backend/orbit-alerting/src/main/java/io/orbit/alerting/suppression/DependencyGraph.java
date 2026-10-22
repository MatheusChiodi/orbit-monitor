package io.orbit.alerting.suppression;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * BE-30: dependencies between monitors/groups (orbit.dependencies.json). When an upstream node is
 * down, its downstream alerts collapse into the upstream incident ("blast radius"). Suppression follows
 * direct edges, so a chain only collapses while every link in it is down.
 */
public class DependencyGraph {

    private final Map<String, Set<String>> downstreams = new HashMap<>();
    private final Map<String, Set<String>> upstreams = new HashMap<>();

    /** Declares that {@code downstream} depends on {@code upstream}; cycles are rejected. */
    public synchronized void addDependency(String upstream, String downstream) {
        if (upstream == null || downstream == null || upstream.isBlank() || downstream.isBlank()) {
            throw new IllegalArgumentException("Both ends of a dependency are required");
        }
        if (upstream.equals(downstream) || reachable(downstream).contains(upstream)) {
            throw new IllegalArgumentException("Dependency " + upstream + " -> " + downstream + " creates a cycle");
        }
        downstreams.computeIfAbsent(upstream, k -> new LinkedHashSet<>()).add(downstream);
        upstreams.computeIfAbsent(downstream, k -> new LinkedHashSet<>()).add(upstream);
    }

    /** Everything that depends on {@code node}, directly or transitively. */
    public synchronized Set<String> impactOf(String node) {
        return reachable(node);
    }

    /** Down nodes that are not explained by another down node upstream. */
    public synchronized Set<String> rootCauses(Set<String> down) {
        Set<String> roots = new TreeSet<>();
        for (String node : down) {
            if (!suppressed(node, down)) {
                roots.add(node);
            }
        }
        return roots;
    }

    /** True when an upstream dependency of {@code node} is also down. */
    public synchronized boolean isSuppressed(String node, Set<String> down) {
        return suppressed(node, down);
    }

    private boolean suppressed(String node, Set<String> down) {
        return upstreams.getOrDefault(node, Set.of()).stream().anyMatch(down::contains);
    }

    private Set<String> reachable(String node) {
        Set<String> seen = new LinkedHashSet<>();
        Deque<String> queue = new ArrayDeque<>(downstreams.getOrDefault(node, Set.of()));
        while (!queue.isEmpty()) {
            String next = queue.poll();
            if (seen.add(next)) {
                queue.addAll(downstreams.getOrDefault(next, Set.of()));
            }
        }
        return seen;
    }
}
