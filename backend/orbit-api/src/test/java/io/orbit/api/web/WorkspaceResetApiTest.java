package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.hamcrest.Matchers.anEmptyMap;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-58: workspace reset restores defaults and keeps monitors, groups and connections")
class WorkspaceResetApiTest {

    @Autowired
    MockMvc mvc;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("defaults, workspace customization and terminology go back to built-ins; nothing else is touched")
    void reset() throws Exception {
        send(put("/api/settings/defaults"), "{\"theme\":\"nord\",\"animation\":\"minimal\"}").andExpect(status().isOk());
        send(put("/api/customization/workspace"), "{\"values\":{\"card.monitor.clickAction\":\"expand\"}}")
                .andExpect(status().isOk());
        send(put("/api/terminology/pt-BR"), "{\"terms\":{\"status.DOWN\":\"Fora do ar\"}}").andExpect(status().isOk());
        send(put("/api/groups/grp_reset_keep"), "{\"name\":\"Kept\"}").andExpect(status().isOk());
        send(post("/api/monitors"), """
                {"id":"tcp_reset_keep","type":"TCP","name":"Kept","groupId":"grp_reset_keep","host":"127.0.0.1","port":1}
                """).andExpect(status().isOk());

        mvc.perform(post("/api/workspace/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reset", hasItem("defaults")))
                .andExpect(jsonPath("$.reset", hasItem("customization")))
                .andExpect(jsonPath("$.reset", hasItem("terminology")));

        mvc.perform(get("/api/settings/defaults"))
                .andExpect(jsonPath("$.theme").value("orbit-dark"))
                .andExpect(jsonPath("$.animation").value("standard"));
        mvc.perform(get("/api/customization/workspace")).andExpect(status().isNotFound());
        mvc.perform(get("/api/terminology/pt-BR")).andExpect(jsonPath("$.terms", anEmptyMap()));
        mvc.perform(get("/api/monitors/tcp_reset_keep")).andExpect(status().isOk());
        mvc.perform(get("/api/groups")).andExpect(jsonPath("$[*].id", hasItem("grp_reset_keep")));
        mvc.perform(get("/api/audit").param("action", "workspace.reset"))
                .andExpect(jsonPath("$[0].detail").value("defaults, customization, terminology"));
    }

    @Test
    @DisplayName("resetting twice is harmless")
    void idempotent() throws Exception {
        mvc.perform(post("/api/workspace/reset")).andExpect(status().isOk());
        mvc.perform(post("/api/workspace/reset")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("only editors may reset")
    void needsAnEditor() throws Exception {
        mvc.perform(post("/api/workspace/reset").with(r -> {
            r.setRemoteAddr("192.168.0.5");
            return r;
        })).andExpect(status().isForbidden());
    }
}
