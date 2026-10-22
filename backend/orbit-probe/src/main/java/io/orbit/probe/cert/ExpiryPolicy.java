package io.orbit.probe.cert;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.common.MonitorState;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;

/** BE-05: certificate and domain expiry warnings (30/14/7 days) and RDAP domain expiry parsing. */
public final class ExpiryPolicy {

    /** Warning steps, largest first. */
    private static final List<Integer> STEPS = List.of(30, 14, 7);
    private static final int WARN_FROM = 30;
    private static final int DOWN_FROM = 7;
    private static final ObjectMapper JSON = new ObjectMapper();

    private ExpiryPolicy() {
    }

    /** OK above 30 days, WARN from 30 to 8 days, DOWN at 7 days or less (and when expired). */
    public static MonitorState stateFor(long daysLeft) {
        if (daysLeft <= DOWN_FROM) {
            return MonitorState.DOWN;
        }
        return daysLeft <= WARN_FROM ? MonitorState.WARN : MonitorState.OK;
    }

    /** The warning step just crossed (30, 14 or 7), used to notify once per step. */
    public static Optional<Integer> warningStep(long daysLeft) {
        Integer crossed = null;
        for (int step : STEPS) {
            if (daysLeft <= step) {
                crossed = step;
            }
        }
        return Optional.ofNullable(crossed);
    }

    /** Domain expiry from an RDAP JSON response ({@code events[eventAction=expiration].eventDate}). */
    public static Optional<Instant> domainExpiry(String rdapJson) {
        if (rdapJson == null || rdapJson.isBlank()) {
            return Optional.empty();
        }
        try {
            JsonNode events = JSON.readTree(rdapJson).path("events");
            for (JsonNode event : events) {
                if ("expiration".equalsIgnoreCase(event.path("eventAction").asText())) {
                    return parse(event.path("eventDate").asText());
                }
            }
            return Optional.empty();
        } catch (JsonProcessingException e) {
            return Optional.empty();
        }
    }

    private static Optional<Instant> parse(String date) {
        try {
            return Optional.of(OffsetDateTime.parse(date).toInstant());
        } catch (DateTimeParseException e) {
            return Optional.empty();
        }
    }
}
