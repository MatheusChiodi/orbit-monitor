package io.orbit.alerting.escalation;

import io.orbit.alerting.Incident;
import io.orbit.config.ConfigItem;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * BE-27: timed escalation steps per group (0 min team channel, 15 min manager, 30 min directors),
 * stored in orbit.escalation.json. Escalation stops as soon as the incident is acknowledged.
 */
public record EscalationPolicy(String id, String name, List<Step> steps) implements ConfigItem {

    /** @param channelIds channels notified when the step is reached */
    public record Step(Duration after, List<String> channelIds) {
    }

    /** Steps whose time has come and that were not sent yet ({@code alreadySent} = indexes). */
    public List<Step> due(Incident incident, Instant now, List<Integer> alreadySent) {
        throw new UnsupportedOperationException("BE-27 escalation policies are not implemented yet");
    }

    /** When the next step fires (shown as a countdown on the wall); empty when acknowledged or done. */
    public Optional<Instant> nextEscalationAt(Incident incident, List<Integer> alreadySent) {
        throw new UnsupportedOperationException("BE-27 escalation policies are not implemented yet");
    }
}
