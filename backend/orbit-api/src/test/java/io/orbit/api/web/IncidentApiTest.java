package io.orbit.api.web;

import io.orbit.alerting.IncidentService;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-26/CORE-06 incident API: resolve, reopen, filters, postmortem (BE-34) and anonymization (BE-45)")
class IncidentApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    IncidentService incidents;

    private static RequestPostProcessor from(String address) {
        return request -> {
            request.setRemoteAddr(address);
            return request;
        };
    }

    private String open(String monitorId) {
        Instant now = Instant.now();
        incidents.onStateChanged(new MonitorStateChanged(monitorId, MonitorState.OK, MonitorState.DOWN, now, now));
        return incidents.openIncident(monitorId).orElseThrow().id();
    }

    private org.springframework.test.web.servlet.ResultActions action(String id, String action, String operator)
            throws Exception {
        return mvc.perform(post("/api/incidents/" + id + "/" + action).header(Operators.HEADER, operator)
                .contentType(MediaType.APPLICATION_JSON).content("{}"));
    }

    @Test
    @DisplayName("resolve and reopen record the operator; a second resolve is a conflict")
    void resolveAndReopen() throws Exception {
        String id = open("api_resolve");
        action(id, "ack", "Ana").andExpect(jsonPath("$.acknowledgedBy").value("Ana"));
        action(id, "resolve", "Bia").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.events[2].type").value("RESOLVED"))
                .andExpect(jsonPath("$.events[2].actor").value("Bia"));
        action(id, "resolve", "Bia").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("conflict"));
        action(id, "reopen", "Caio").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.acknowledgedBy").doesNotExist())
                .andExpect(jsonPath("$.events[3].type").value("REOPENED"))
                .andExpect(jsonPath("$.events[3].actor").value("Caio"));
        action(id, "resolve", "").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("operator-required"));
    }

    @Test
    @DisplayName("the list filters by status and monitor")
    void filters() throws Exception {
        String open = open("api_filter_open");
        String resolved = open("api_filter_resolved");
        incidents.resolve(resolved, "Ana");
        mvc.perform(get("/api/incidents").param("status", "OPEN").param("monitorId", "api_filter_open"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(open));
        mvc.perform(get("/api/incidents").param("status", "RESOLVED").param("monitorId", "api_filter_resolved"))
                .andExpect(jsonPath("$[0].id").value(resolved));
        mvc.perform(get("/api/incidents").param("status", "nope")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("the postmortem has the timeline, MTTA, MTTR and who acknowledged")
    void postmortem() throws Exception {
        String id = open("api_pm");
        incidents.acknowledge(id, "Ana");
        incidents.comment(id, "Ana", "Pool restarted");
        incidents.resolve(id, "Ana");
        mvc.perform(get("/api/incidents/" + id + "/postmortem"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incidentId").value(id))
                .andExpect(jsonPath("$.monitorId").value("api_pm"))
                .andExpect(jsonPath("$.acknowledgedBy").value("Ana"))
                .andExpect(jsonPath("$.timeToAcknowledgeSeconds").isNumber())
                .andExpect(jsonPath("$.timeToResolveSeconds").isNumber())
                .andExpect(jsonPath("$.timeline[0].type").value("OPENED"))
                .andExpect(jsonPath("$.timeline[2].detail").value("Pool restarted"));
        mvc.perform(get("/api/incidents/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incidents").isNumber())
                .andExpect(jsonPath("$.groups").isArray());
        mvc.perform(get("/api/incidents/inc_nope/postmortem")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("LAN clients may acknowledge but not resolve, reopen or link tickets")
    void lanPolicy() throws Exception {
        String id = open("api_lan");
        mvc.perform(post("/api/incidents/" + id + "/resolve").with(from("192.168.0.5")).header(Operators.HEADER, "TV")
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/incidents/" + id + "/ack").with(from("192.168.0.5"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"by\":\"TV\"}")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("anonymizing an operator also anonymizes incidents")
    void anonymize() throws Exception {
        String id = open("api_anon");
        incidents.acknowledge(id, "Dora Lima");
        mvc.perform(post("/api/operators/anonymize").header(Operators.HEADER, "Admin")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Dora Lima\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incidents").value(1));
        mvc.perform(get("/api/incidents/" + id)).andExpect(jsonPath("$.acknowledgedBy").value("anonymized"));
    }
}
