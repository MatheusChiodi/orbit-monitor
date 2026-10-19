package io.orbit.alerting.report;

import io.orbit.alerting.Incident;
import io.orbit.alerting.IncidentEvent;

import java.time.Duration;
import java.util.List;

/** BE-34: post-incident report generated from the timeline: MTTA, MTTR and who acknowledged. */
public record PostmortemReport(String incidentId, String monitorId, Duration timeToAcknowledge,
                               Duration timeToResolve, String acknowledgedBy, List<IncidentEvent> timeline) {

    public static PostmortemReport of(Incident incident) {
        throw new UnsupportedOperationException("BE-34 postmortem report is not implemented yet");
    }

    /** Mean times over several incidents (per team reports); null averages without data. */
    public record Summary(int incidents, Duration meanTimeToAcknowledge, Duration meanTimeToResolve) {
    }

    public static Summary summarize(List<Incident> incidents) {
        throw new UnsupportedOperationException("BE-34 postmortem report is not implemented yet");
    }
}
