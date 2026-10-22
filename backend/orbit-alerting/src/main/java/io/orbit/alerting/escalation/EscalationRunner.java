package io.orbit.alerting.escalation;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentService;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
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
 * exactly once, using the policy bound to the monitor's group. A step may name an on-call schedule
 * (BE-33) whose current person goes into the message. Incidents collapsed into an upstream incident
 * (BE-30) never escalate.
 */
public class EscalationRunner {

    /** Sends one escalation step; {@code onCall} is the person on call now, or null. */
    @FunctionalInterface
    public interface Notifier {
        void escalate(Incident incident, EscalationPolicy.Step step, String onCall);
    }

    /** Next step of an incident, for the wall/console countdown (FE-40). */
    public record Upcoming(String incidentId, String monitorId, String policyId, String policyName, int stepIndex,
                           String stepName, Instant dueAt, List<String> channelIds, String onCall) {
    }

    private final Supplier<List<EscalationPolicy>> policies;
    private final IncidentService incidents;
    private final Function<String, Optional<String>> groupOfMonitor;
    private final Notifier notifier;
    private final Function<String, Optional<String>> onCallNow;
    private final Clock clock;
    private final Map<String, Set<Integer>> sentSteps = new ConcurrentHashMap<>();

    public EscalationRunner(Supplier<List<EscalationPolicy>> policies, IncidentService incidents,
                            Function<String, Optional<String>> groupOfMonitor, Notifier notifier,
                            Function<String, Optional<String>> onCallNow, Clock clock) {
        this.policies = policies;
        this.incidents = incidents;
        this.groupOfMonitor = groupOfMonitor;
        this.notifier = notifier;
        this.onCallNow = onCallNow;
        this.clock = clock;
    }

    /** Without on-call schedules: each due step notifies its channels. */
    public EscalationRunner(Supplier<List<EscalationPolicy>> policies, IncidentService incidents,
                            Function<String, Optional<String>> groupOfMonitor,
                            BiConsumer<Incident, List<String>> notify, Clock clock) {
        this(policies, incidents, groupOfMonitor, (incident, step, onCall) -> notify.accept(incident, step.channelIds()),
                scheduleId -> Optional.empty(), clock);
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
            for (int i = 0; i < steps.size(); i++) {
                EscalationPolicy.Step step = steps.get(i);
                if (!sent.contains(i) && due.contains(step)) {
                    sent.add(i);
                    notifier.escalate(incident, step, onCall(step));
                }
            }
        }
    }

    /** When the next step fires, for the wall countdown; empty when acknowledged, resolved or done. */
    public Optional<Instant> escalatesAt(Incident incident) {
        return next(incident).map(Upcoming::dueAt);
    }

    /** Next step of {@code incident}; empty when acknowledged, resolved, collapsed or without a policy. */
    public Optional<Upcoming> next(Incident incident) {
        return policyFor(incident).flatMap(policy -> policy
                .nextStepIndex(incident, new ArrayList<>(sentSteps.getOrDefault(incident.id(), Set.of())))
                .map(index -> {
                    EscalationPolicy.Step step = policy.steps().get(index);
                    return new Upcoming(incident.id(), incident.monitorId(), policy.id(), policy.name(), index,
                            policy.stepName(index), incident.openedAt().plus(step.after()), step.channelIds(),
                            onCall(step));
                }));
    }

    /** Next step of every open incident that still escalates, soonest first. */
    public List<Upcoming> upcoming() {
        return incidents.recent().stream().filter(Incident::isOpen).map(this::next).flatMap(Optional::stream)
                .sorted(Comparator.comparing(Upcoming::dueAt)).toList();
    }

    private String onCall(EscalationPolicy.Step step) {
        return step.onCallScheduleId() == null ? null : onCallNow.apply(step.onCallScheduleId()).orElse(null);
    }

    private Optional<EscalationPolicy> policyFor(Incident incident) {
        if (incident.parentId() != null) {
            return Optional.empty();
        }
        Optional<String> group = groupOfMonitor.apply(incident.monitorId());
        return group.flatMap(g -> policies.get().stream().filter(p -> p.groupIds().contains(g)).findFirst());
    }
}
