package io.orbit.api.web;

import io.orbit.monitor.definition.MonitorDefinitions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-48 secret rotation without recreating monitors")
class SecretRotationApiTest {

    private static final String URL = "jdbc:h2:mem:rotation;DB_CLOSE_DELAY=-1";

    @Autowired
    MockMvc mvc;
    @Autowired
    MonitorDefinitions definitions;

    private void putConnection(String password) throws Exception {
        mvc.perform(put("/api/connections/con_rot").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Rot\",\"jdbcUrl\":\"" + URL + "\",\"username\":\"sa\",\"password\":\""
                                + password + "\",\"poolSize\":1}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a new password replaces the sealed secret and the pool; monitors keep their reference")
    void rotates() throws Exception {
        putConnection("first");
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"sel_rot\",\"type\":\"SQL\",\"name\":\"Rot\",\"connectionId\":\"con_rot\","
                        + "\"sql\":\"SELECT 1 AS ONE\",\"intervalSeconds\":60,\"timeoutSeconds\":5,\"retries\":1}"))
                .andExpect(status().isOk());
        var before = definitions.connection("con_rot").orElseThrow().password();

        putConnection("second");

        assertThat(definitions.connection("con_rot").orElseThrow().password()).isNotEqualTo(before);
        assertThat(definitions.selects()).anyMatch(s -> s.id().equals("sel_rot") && s.connectionId().equals("con_rot"));
        mvc.perform(post("/api/connections/con_rot/test").header(Operators.HEADER, "Ana"))
                .andExpect(jsonPath("$.ok").value(true));
    }
}
