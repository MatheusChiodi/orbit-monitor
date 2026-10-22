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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-30 orbit.dependencies.json API, graph for the console and cascade into one incident")
class DependencyApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    IncidentService incidents;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private void down(String monitorId) {
        Instant now = Instant.now();
        incidents.onStateChanged(new MonitorStateChanged(monitorId, MonitorState.OK, MonitorState.DOWN, now, now));
    }

    @Test
    @DisplayName("edges are saved, cycles and self-loops are refused, and the graph lists nodes and edges")
    void crud() throws Exception {
        send(put("/api/groups/grp_dep_bus"), "{\"name\":\"Service bus\"}").andExpect(status().isOk());
        send(put("/api/dependencies/dep_a"), "{\"upstream\":\"grp_dep_bus\",\"downstream\":\"dep_portal\",\"note\":\"reads\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upstream").value("grp_dep_bus"));
        send(put("/api/dependencies/dep_b"), "{\"upstream\":\"dep_portal\",\"downstream\":\"dep_checkout\"}")
                .andExpect(status().isOk());
        send(put("/api/dependencies/dep_c"), "{\"upstream\":\"dep_checkout\",\"downstream\":\"grp_dep_bus\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-config"));
        send(put("/api/dependencies/dep_d"), "{\"upstream\":\"x\",\"downstream\":\"x\"}")
                .andExpect(status().isUnprocessableEntity());

        mvc.perform(get("/api/dependencies")).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/dependencies/graph"))
                .andExpect(jsonPath("$.edges.length()").value(2))
                .andExpect(jsonPath("$.nodes[?(@.id == 'grp_dep_bus')].kind").value("GROUP"))
                .andExpect(jsonPath("$.nodes[?(@.id == 'grp_dep_bus')].name").value("Service bus"))
                .andExpect(jsonPath("$.nodes[?(@.id == 'dep_checkout')].kind").value("UNKNOWN"));
        mvc.perform(get("/api/dependencies/impact/grp_dep_bus"))
                .andExpect(jsonPath("$.impacted.length()").value(2));

        mvc.perform(delete("/api/dependencies/dep_b")).andExpect(status().isNoContent());
        mvc.perform(delete("/api/dependencies/dep_b")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("a downstream monitor's incident collapses into the upstream incident")
    void cascade() throws Exception {
        send(put("/api/dependencies/dep_cascade"), "{\"upstream\":\"cas_bus\",\"downstream\":\"cas_portal\"}")
                .andExpect(status().isOk());
        down("cas_bus");
        down("cas_portal");
        String root = incidents.openIncident("cas_bus").orElseThrow().id();
        assertThat(incidents.openIncident("cas_portal").orElseThrow().parentId()).isEqualTo(root);
        mvc.perform(get("/api/dependencies/graph")).andExpect(jsonPath("$.rootCauses[0]").value("cas_bus"));
    }
}
