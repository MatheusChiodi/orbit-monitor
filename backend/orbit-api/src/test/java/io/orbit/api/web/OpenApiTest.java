package io.orbit.api.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-49 OpenAPI document for the frontend build")
class OpenApiTest {

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("documents the REST endpoints")
    void documentsEndpoints() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/wall/snapshot']").exists())
                .andExpect(jsonPath("$.paths['/api/monitors']").exists())
                .andExpect(jsonPath("$.paths['/api/monitors/preview']").exists())
                .andExpect(jsonPath("$.paths['/api/incidents/{id}/ack']").exists())
                .andExpect(jsonPath("$.paths['/api/access']").exists());
    }
}
