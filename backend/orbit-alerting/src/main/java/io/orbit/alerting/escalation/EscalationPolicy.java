package io.orbit.alerting.escalation;

import io.orbit.alerting.Incident;
import io.orbit.config.ConfigItem;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * BE-27: timed escalation steps per group (0 min team channel, 15 min manager, 30 min directors),
 * stored in orbit.escalation.json and bound to groups by {@code groupIds}. Escalation stops as soon as
 * the incident is acknowledged or resolved.
 */
public record EscalationPolicy(String id, String name, List<Step> steps, List<String> groupIds) implements ConfigItem {

    /**
     * @param channelIds       channels notified when the step is reached
     * @param name             shown in the countdown ("Escalates to On-call manager in 08:12"); defaults to "Step n"
     * @param onCallScheduleId BE-33: schedule whose current person is named in the escalation message
     */
    public record Step(Duration after, List<String> channelIds, String name, String onCallScheduleId) {

        public Step {
            channelIds = channelIds == null ? List.of() : List.copyOf(channelIds);
        }

        public Step(Duration after, List<String> channelIds) {
            this(after, channelIds, null, null);
        }
    }

    public EscalationPolicy {
        steps = steps == null ? List.of() : List.copyOf(steps);
        groupIds = groupIds == null ? List.of() : List.copyOf(groupIds);
    }

    /** A policy not yet bound to groups. */
    public EscalationPolicy(String id, String name, List<Step> steps) {
        this(id, name, steps, List.of());
    }

    /** Steps whose time has come and that were not sent yet ({@code alreadySent} = indexes). */
    public List<Step> due(Incident incident, Instant now, List<Integer> alreadySent) {
        if (stopped(incident)) {
            return List.of();
        }
        List<Step> due = new ArrayList<>();
        for (int i = 0; i < steps.size(); i++) {
            Step step = steps.get(i);
            if (!alreadySent.contains(i) && !now.isBefore(incident.openedAt().plus(step.after()))) {
                due.add(step);
            }
        }
        return due;
    }

    /** When the next step fires (shown as a countdown on the wall); empty when acknowledged or done. */
    public Optional<Instant> nextEscalationAt(Incident incident, List<Integer> alreadySent) {
        return nextStepIndex(incident, alreadySent).map(i -> incident.openedAt().plus(steps.get(i).after()));
    }

    /** Index of the next step not sent yet; empty when acknowledged, resolved or done. */
    public Optional<Integer> nextStepIndex(Incident incident, List<Integer> alreadySent) {
        if (stopped(incident)) {
            return Optional.empty();
        }
        for (int i = 0; i < steps.size(); i++) {
            if (!alreadySent.contains(i)) {
                return Optional.of(i);
            }
        }
        return Optional.empty();
    }

    /** Display name of step {@code index} ("Step 2" when it has none). */
    public String stepName(int index) {
        String name = steps.get(index).name();
        return name == null || name.isBlank() ? "Step " + (index + 1) : name;
    }

    private static boolean stopped(Incident incident) {
        return !incident.isOpen() || incident.acknowledgedAt() != null;
    }
}
