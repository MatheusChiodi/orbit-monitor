package io.orbit.alerting.report;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

/** BE-34: post-incident report generated from the timeline: MTTA, MTTR and who acknowledged. */
public record PostmortemReport(String incidentId, String monitorId, Duration timeToAcknowledge,
                               Duration timeToResolve, String acknowledgedBy, List<IncidentEvent> timeline) {

    public PostmortemReport {
        timeline = List.copyOf(timeline);
    }

    /** Times are null while the incident is not acknowledged / not resolved. */
    public static PostmortemReport of(Incident incident) {
        return new PostmortemReport(incident.id(), incident.monitorId(), incident.timeToAcknowledge(),
                incident.duration(), incident.acknowledgedBy(), incident.events());
    }

    /** Mean times over several incidents (per team reports); null averages without data. */
    public record Summary(int incidents, Duration meanTimeToAcknowledge, Duration meanTimeToResolve) {
    }

    public static Summary summarize(List<Incident> incidents) {
        return new Summary(incidents.size(), mean(incidents, Incident::timeToAcknowledge),
                mean(incidents, Incident::duration));
    }

    private static Duration mean(List<Incident> incidents, Function<Incident, Duration> metric) {
        List<Duration> values = incidents.stream().map(metric).filter(Objects::nonNull).toList();
        if (values.isEmpty()) {
            return null;
        }
        return values.stream().reduce(Duration.ZERO, Duration::plus).dividedBy(values.size());
    }
}
