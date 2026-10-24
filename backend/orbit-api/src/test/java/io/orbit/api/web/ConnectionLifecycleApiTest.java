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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-57: draft connection test, usage count and safe connection delete")
class ConnectionLifecycleApiTest {

    private static final String URL = "jdbc:h2:mem:conn-life;DB_CLOSE_DELAY=-1";

    @Autowired
    MockMvc mvc;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private void connection(String id) throws Exception {
        send(put("/api/connections/" + id), """
                {"name":"Life","jdbcUrl":"%s","username":"sa","password":"pw","poolSize":1}
                """.formatted(URL)).andExpect(status().isOk());
    }

    private void select(String id, String connectionId) throws Exception {
        send(post("/api/monitors"), """
                {"id":"%s","type":"SQL","name":"Uses %s","groupId":"grp_conn","connectionId":"%s","sql":"SELECT 1 AS N",
                 "intervalSeconds":60,"timeoutSeconds":10,"retries":1,"conditions":[],"fields":[]}
                """.formatted(id, connectionId, connectionId)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("a draft is tested without being saved and its password is never echoed")
    void draftTest() throws Exception {
        send(post("/api/connections/test"), """
                {"name":"Draft","jdbcUrl":"jdbc:h2:mem:conn-draft","username":"sa","password":"draft-secret-pw"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(content().string(not(containsString("draft-secret-pw"))));
        mvc.perform(get("/api/connections")).andExpect(content().string(not(containsString("Draft"))));
        mvc.perform(get("/api/audit").param("action", "connection.test"))
                .andExpect(jsonPath("$[0].target").value("draft"))
                .andExpect(content().string(not(containsString("draft-secret-pw"))));
    }

    @Test
    @DisplayName("a failing draft reports the error without the password")
    void draftFailure() throws Exception {
        send(post("/api/connections/test"), """
                {"name":"Bad","jdbcUrl":"jdbc:h2:mem:conn-bad;IFEXISTS=TRUE","username":"sa","password":"leaky-pw"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(false))
                .andExpect(jsonPath("$.error").isNotEmpty())
                .andExpect(content().string(not(containsString("leaky-pw"))));
    }

    @Test
    @DisplayName("editing an existing connection can test with its stored password")
    void draftReusesStoredPassword() throws Exception {
        connection("con_life_keep");
        send(post("/api/connections/test"), """
                {"id":"con_life_keep","name":"Life","jdbcUrl":"%s","username":"sa"}
                """.formatted(URL)).andExpect(jsonPath("$.ok").value(true));
    }

    @Test
    @DisplayName("a draft with an unsupported URL is rejected")
    void draftValidation() throws Exception {
        send(post("/api/connections/test"), "{\"name\":\"X\",\"jdbcUrl\":\"jdbc:unknown:x\",\"username\":\"sa\"}")
                .andExpect(status().isBadRequest());
        send(post("/api/connections/test"), "{\"name\":\"X\",\"username\":\"sa\"}").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("the list says how many monitors use each connection and delete needs force while in use")
    void usedBy() throws Exception {
        connection("con_life_used");
        select("sel_life_used", "con_life_used");
        mvc.perform(get("/api/connections"))
                .andExpect(jsonPath("$[?(@.id == 'con_life_used')].usedBy").value(1));

        mvc.perform(delete("/api/connections/con_life_used"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("connection-in-use"))
                .andExpect(jsonPath("$.usedBy[0].id").value("sel_life_used"))
                .andExpect(jsonPath("$.usedBy[0].name").value("Uses con_life_used"));

        mvc.perform(delete("/api/connections/con_life_used").param("force", "true")).andExpect(status().isNoContent());
        mvc.perform(get("/api/monitors/sel_life_used")).andExpect(jsonPath("$.definition.paused").value(true));
        mvc.perform(get("/api/audit").param("target", "con_life_used"))
                .andExpect(jsonPath("$[0].action").value("connection.delete"))
                .andExpect(jsonPath("$[0].detail").value("forced, paused: sel_life_used"));
        mvc.perform(delete("/api/connections/con_life_used")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("an unused connection is deleted directly")
    void unusedDelete() throws Exception {
        connection("con_life_free");
        mvc.perform(get("/api/connections")).andExpect(jsonPath("$[?(@.id == 'con_life_free')].usedBy").value(0));
        mvc.perform(delete("/api/connections/con_life_free")).andExpect(status().isNoContent());
    }
}
