package io.orbit.api.web;

import com.jayway.jsonpath.JsonPath;
import io.orbit.api.config.OrbitProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-01/BE-02/BE-03 TCP, ping and push monitors over the API")
class ChecksApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;

    @Test
    @DisplayName("a push monitor gets a one-time URL that any machine can call")
    void push() throws Exception {
        String created = mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"PUSH\",\"name\":\"Nightly batch\",\"groupId\":\"grp_batch\","
                                + "\"intervalSeconds\":60,\"maxSilenceSeconds\":3600}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.definition.type").value("PUSH"))
                .andExpect(jsonPath("$.definition.pushToken").value("•••• (vault)"))
                .andReturn().getResponse().getContentAsString();
        String pushUrl = JsonPath.read(created, "$.pushUrl");
        String id = JsonPath.read(created, "$.definition.id");
        String token = pushUrl.substring(pushUrl.lastIndexOf('/') + 1);
        assertThat(Files.readString(properties.configDir().resolve("orbit.checks.json"))).doesNotContain(token);

        mvc.perform(post("/api/push/" + token).with(r -> {
            r.setRemoteAddr("10.20.30.40");
            return r;
        })).andExpect(status().isOk()).andExpect(jsonPath("$.monitorId").value(id));
        mvc.perform(post("/api/push/not-a-token")).andExpect(status().isNotFound());

        mvc.perform(post("/api/monitors/" + id + "/run").header(Operators.HEADER, "Ana"))
                .andExpect(jsonPath("$.state").value("OK"));
        mvc.perform(get("/api/monitors/" + id)).andExpect(jsonPath("$.pushUrl").doesNotExist());
    }

    @Test
    @DisplayName("a TCP monitor is created from the console form")
    void tcp() throws Exception {
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"TCP\",\"name\":\"Oracle listener\",\"host\":\"127.0.0.1\",\"port\":1,"
                                + "\"intervalSeconds\":60,\"timeoutSeconds\":2,\"retries\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.definition.port").value(1))
                .andExpect(jsonPath("$.status.type").value("TCP"));
    }
}
