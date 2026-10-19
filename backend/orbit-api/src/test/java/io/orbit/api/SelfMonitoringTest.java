package io.orbit.api;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Tag("pending")
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-50 self-monitoring metrics")
class SelfMonitoringTest {

    @Autowired
    MockMvc mvc;

    @Test
    @DisplayName("Micrometer exposes check counters and queue size")
    void metrics() throws Exception {
        mvc.perform(get("/actuator/metrics/orbit.checks")).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("orbit.checks"));
        mvc.perform(get("/actuator/metrics/orbit.queue.size")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Orbit lists itself as the first monitor")
    void monitorsItself() throws Exception {
        mvc.perform(get("/api/monitors")).andExpect(jsonPath("$[0].id").value("orbit_self"));
    }
}
