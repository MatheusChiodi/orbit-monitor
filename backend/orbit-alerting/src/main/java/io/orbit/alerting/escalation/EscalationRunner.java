package io.orbit.alerting.escalation;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * BE-27: called on a timer; sends each due escalation step of every open, unacknowledged incident
 * exactly once, using the policy bound to the monitor's group.
 */
public class EscalationRunner {

    private final Supplier<List<EscalationPolicy>> policies;
    private final IncidentService incidents;
    private final Function<String, Optional<String>> groupOfMonitor;
    private final BiConsumer<Incident, List<String>> notify;
    private final Clock clock;
    private final Map<String, Set<Integer>> sentSteps = new ConcurrentHashMap<>();

    public EscalationRunner(Supplier<List<EscalationPolicy>> policies, IncidentService incidents,
                            Function<String, Optional<String>> groupOfMonitor,
                            BiConsumer<Incident, List<String>> notify, Clock clock) {
        this.policies = policies;
        this.incidents = incidents;
        this.groupOfMonitor = groupOfMonitor;
        this.notify = notify;
        this.clock = clock;
    }

    public synchronized void tick() {
        Instant now = clock.instant();
        for (Incident incident : incidents.recent()) {
            if (!incident.isOpen()) {
                sentSteps.remove(incident.id());
                continue;
            }
            Optional<EscalationPolicy> policy = policyFor(incident);
            if (policy.isEmpty()) {
                continue;
            }
            Set<Integer> sent = sentSteps.computeIfAbsent(incident.id(), id -> ConcurrentHashMap.newKeySet());
            List<EscalationPolicy.Step> steps = policy.get().steps();
            List<EscalationPolicy.Step> due = policy.get().due(incident, now, new ArrayList<>(sent));
            for (EscalationPolicy.Step step : due) {
                sent.add(steps.indexOf(step));
                notify.accept(incident, step.channelIds());
            }
        }
    }

    /** When the next step fires, for the wall countdown; empty when acknowledged, resolved or done. */
    public Optional<Instant> escalatesAt(Incident incident) {
        return policyFor(incident).flatMap(p -> p.nextEscalationAt(incident,
                new ArrayList<>(sentSteps.getOrDefault(incident.id(), Set.of()))));
    }

    private Optional<EscalationPolicy> policyFor(Incident incident) {
        if (incident.parentId() != null) {
            return Optional.empty();
        }
        Optional<String> group = groupOfMonitor.apply(incident.monitorId());
        return group.flatMap(g -> policies.get().stream().filter(p -> p.groupIds().contains(g)).findFirst());
    }
}
