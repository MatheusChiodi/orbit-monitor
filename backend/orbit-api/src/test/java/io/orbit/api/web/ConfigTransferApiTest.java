package io.orbit.api.web;

import io.orbit.api.config.OrbitProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-37 config export/import over the API")
class ConfigTransferApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;

    @Test
    @DisplayName("export omits sealed secrets; import is a dry run unless asked otherwise")
    void exportAndImport() throws Exception {
        mvc.perform(put("/api/connections/con_xfer").header(Operators.HEADER, "Ana")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Xfer\",\"jdbcUrl\":\"jdbc:h2:mem:xfer\",\"username\":\"sa\",\"password\":\"pw\","
                        + "\"poolSize\":1}")).andExpect(status().isOk());
        String sealed = Files.readString(properties.configDir().resolve("orbit.connections.json"));
        assertThat(sealed).contains("\"enc\"");

        byte[] zip = mvc.perform(get("/api/config/export")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        String connections = entry(zip, "orbit.connections.json");
        assertThat(connections).contains("con_xfer").doesNotContain("\"enc\"");

        mvc.perform(post("/api/config/import").header(Operators.HEADER, "Ana")
                        .contentType("application/zip").content(zip))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.file == 'orbit.connections.json')].changed.length()").value(0));
        mvc.perform(post("/api/config/import").param("dryRun", "false").header(Operators.HEADER, "Ana")
                .contentType("application/zip").content(zip)).andExpect(status().isOk());
        assertThat(Files.readString(properties.configDir().resolve("orbit.connections.json"))).contains("\"enc\"");
        mvc.perform(post("/api/connections/con_xfer/test").header(Operators.HEADER, "Ana"))
                .andExpect(jsonPath("$.ok").value(true));
    }

    private static String entry(byte[] zip, String name) throws Exception {
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            for (ZipEntry e; (e = in.getNextEntry()) != null; ) {
                if (e.getName().equals(name)) {
                    return new String(in.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        }
        throw new AssertionError(name + " not in the archive");
    }
}
