package io.orbit.api.web;

import io.orbit.api.config.OrbitProperties;
import io.orbit.api.runtime.ConfigReloader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("Alerting config files (silences, on-call, ...) pick up external edits through the 5 s reload")
class AlertingReloadTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;
    @Autowired
    ConfigReloader reloader;

    @Test
    @DisplayName("an externally written silences file and on-call file are served after a reload")
    void reloads() throws Exception {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        Files.createDirectories(properties.configDir());
        Files.writeString(properties.configDir().resolve("orbit.silences.json"), "{\"version\":1,\"items\":[{\"id\":"
                + "\"sil_ext\",\"target\":\"ext_monitor\",\"reason\":\"Edited by hand\",\"createdBy\":\"Ana\","
                + "\"createdAt\":\"" + now + "\",\"until\":\"" + now.plusSeconds(3600) + "\"}]}");
        Files.writeString(properties.configDir().resolve("orbit.oncall.json"), "{\"version\":1,\"items\":[{\"id\":"
                + "\"onc_ext\",\"name\":\"Ext\",\"people\":[\"Bia\"],\"start\":\"" + now.minusSeconds(60)
                + "\",\"shift\":\"PT24H\"}]}");

        assertThat(reloader.reloadChanged()).contains("orbit.silences.json", "orbit.oncall.json");

        mvc.perform(get("/api/silences")).andExpect(jsonPath("$[0].id").value("sil_ext"));
        mvc.perform(get("/api/oncall/now")).andExpect(jsonPath("$[0].person").value("Bia"));
    }
}
