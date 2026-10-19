package io.orbit.api.web;

import io.orbit.api.config.OrbitProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Tag("pending")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("CORE-08 access policy and defaults in orbit.settings.json")
class SettingsFileTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;

    @Test
    @DisplayName("switching edit access to LAN from loopback is saved and applied at once")
    void lanEditing() throws Exception {
        mvc.perform(put("/api/settings").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"access\":{\"editFrom\":\"lan\"},\"locale\":\"pt-BR\",\"historyHours\":24}"))
                .andExpect(status().isOk());

        assertThat(Files.readString(properties.configDir().resolve("orbit.settings.json"))).contains("\"lan\"");
        mvc.perform(get("/api/access").with(r -> {
            r.setRemoteAddr("192.168.0.5");
            return r;
        })).andExpect(jsonPath("$.mode").value("edit"));
    }

    @Test
    @DisplayName("settings cannot be changed from the LAN while edits are loopback-only")
    void lanCannotChange() throws Exception {
        mvc.perform(put("/api/settings").with(r -> {
                    r.setRemoteAddr("192.168.0.5");
                    return r;
                }).header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                .content("{\"access\":{\"editFrom\":\"lan\"}}")).andExpect(status().isForbidden());
    }
}
