package io.orbit.api.web;

import io.orbit.api.config.OrbitProperties;
import io.orbit.api.runtime.ConfigReloader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.time.Instant;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-46 audit query and CORE-19 config files over the API")
class AuditAndConfigApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;
    @Autowired
    ConfigReloader reloader;

    @Test
    @DisplayName("audit pages carry the total; time range and operator filters apply")
    void auditPaging() throws Exception {
        Instant before = Instant.now();
        for (int i = 0; i < 3; i++) {
            mvc.perform(put("/api/groups/grp_audit_" + i)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Audit " + i + "\"}"))
                    .andExpect(status().isOk());
        }

        mvc.perform(get("/api/audit").param("operator", "loopback").param("action", "group.").param("from", before.toString())
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "3"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].target").value("grp_audit_2"));
        mvc.perform(get("/api/audit").param("operator", "loopback").param("action", "group.").param("from", before.toString())
                        .param("offset", "2"))
                .andExpect(jsonPath("$[0].target").value("grp_audit_0"));
        mvc.perform(get("/api/audit").param("operator", "loopback").param("action", "group.").param("from", before.toString())
                        .param("to", before.toString()))
                .andExpect(header().string("X-Total-Count", "0"));
        mvc.perform(get("/api/audit").param("from", "yesterday"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad-request"));
    }

    @Test
    @DisplayName("health lists every config file; external edits are reloaded")
    void healthAndReload() throws Exception {
        mvc.perform(get("/api/config/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].file", hasItem("orbit.customization.json")))
                .andExpect(jsonPath("$[*].file", hasItem("orbit.variables.json")));

        Files.createDirectories(properties.configDir());
        Files.writeString(properties.configDir().resolve("orbit.workspaces.json"),
                "{\"version\":1,\"items\":[{\"id\":\"wks_external\",\"name\":\"Edited by hand\",\"groupIds\":[]}]}");
        reloader.reloadChanged();
        mvc.perform(get("/api/workspaces")).andExpect(jsonPath("$.items[*].id", hasItem("wks_external")));

        Files.writeString(properties.configDir().resolve("orbit.workspaces.json"), "{\"version\":1,\"items\":[{\"id\":7}]}");
        try {
            reloader.reloadChanged();
            mvc.perform(get("/api/workspaces")).andExpect(jsonPath("$.items[*].id", hasItem("wks_external")));
            mvc.perform(get("/api/config/health"))
                    .andExpect(jsonPath("$[?(@.file == 'orbit.workspaces.json')].state").value(hasItem("invalid")));
        } finally {
            // The Spring context (and its config directory) is shared with other test classes.
            Files.writeString(properties.configDir().resolve("orbit.workspaces.json"), "{\"version\":1,\"items\":[]}");
            reloader.reloadChanged();
        }
    }
}
