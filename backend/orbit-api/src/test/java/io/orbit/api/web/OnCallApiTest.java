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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-33 on-call API and BE-27 upcoming escalation steps")
class OnCallApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    IncidentService incidents;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("schedules are saved and answer who is on call now")
    void onCall() throws Exception {
        Instant start = Instant.now().minus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);
        send(put("/api/oncall/onc_ops"), "{\"name\":\"Ops\",\"people\":[\"Ana\",\"Bia\"],\"start\":\"" + start
                + "\",\"shiftHours\":24}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onCallNow").value("Ana"))
                .andExpect(jsonPath("$.shiftHours").value(24));
        send(put("/api/oncall/onc_bad"), "{\"name\":\"Bad\",\"people\":[],\"shiftHours\":24}")
                .andExpect(status().isUnprocessableEntity());
        send(put("/api/oncall/onc_zero"), "{\"name\":\"Zero\",\"people\":[\"A\"],\"start\":\"" + start
                + "\",\"shiftHours\":0}").andExpect(status().isBadRequest());

        mvc.perform(get("/api/oncall/now"))
                .andExpect(jsonPath("$[0].scheduleId").value("onc_ops"))
                .andExpect(jsonPath("$[0].person").value("Ana"))
                .andExpect(jsonPath("$[0].shiftEndsAt").value(start.plus(24, ChronoUnit.HOURS).toString()));
        mvc.perform(get("/api/oncall")).andExpect(jsonPath("$[0].people[1]").value("Bia"));
        mvc.perform(delete("/api/oncall/onc_ops").header(Operators.HEADER, "Ana")).andExpect(status().isNoContent());
        mvc.perform(get("/api/oncall/now")).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("the next escalation step of an open incident is listed with its name and due time")
    void upcoming() throws Exception {
        Instant start = Instant.now().minus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);
        send(put("/api/oncall/onc_mgr"), "{\"name\":\"Managers\",\"people\":[\"Caio\"],\"start\":\"" + start
                + "\",\"shiftHours\":168}").andExpect(status().isOk());
        send(put("/api/groups/grp_esc"), "{\"name\":\"Escalated\"}").andExpect(status().isOk());
        send(put("/api/connections/con_esc"), "{\"name\":\"H2\",\"jdbcUrl\":\"jdbc:h2:mem:esc;DB_CLOSE_DELAY=-1\","
                + "\"username\":\"sa\",\"password\":\"pw\",\"poolSize\":1}").andExpect(status().isOk());
        send(post("/api/monitors"), "{\"id\":\"sel_esc\",\"type\":\"SQL\",\"name\":\"Esc\",\"groupId\":\"grp_esc\","
                + "\"connectionId\":\"con_esc\",\"sql\":\"SELECT 1 AS ONE\",\"intervalSeconds\":3600,\"timeoutSeconds\":5,"
                + "\"retries\":1}").andExpect(status().isOk());
        send(put("/api/escalation/esc_esc"), "{\"name\":\"Esc policy\",\"groupIds\":[\"grp_esc\"],\"steps\":["
                + "{\"afterMinutes\":15,\"channelIds\":[\"chn_x\"],\"name\":\"Manager\",\"onCallScheduleId\":\"onc_mgr\"}]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.steps[0].name").value("Manager"));
        Instant now = Instant.now();
        incidents.onStateChanged(new MonitorStateChanged("sel_esc", MonitorState.OK, MonitorState.DOWN, now, now));
        String id = incidents.openIncident("sel_esc").orElseThrow().id();

        mvc.perform(get("/api/escalation/upcoming"))
                .andExpect(jsonPath("$[0].incidentId").value(id))
                .andExpect(jsonPath("$[0].stepName").value("Manager"))
                .andExpect(jsonPath("$[0].onCall").value("Caio"))
                .andExpect(jsonPath("$[0].dueAt").exists());
        mvc.perform(get("/api/incidents/" + id + "/escalation")).andExpect(jsonPath("$.stepName").value("Manager"));
        incidents.acknowledge(id, "Ana");
        mvc.perform(get("/api/escalation/upcoming")).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/incidents/" + id + "/escalation")).andExpect(status().isNoContent());
    }
}
