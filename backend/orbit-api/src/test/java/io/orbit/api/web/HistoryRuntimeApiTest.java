package io.orbit.api.web;

import io.orbit.api.runtime.EventBus;
import io.orbit.common.MonitorState;
import io.orbit.history.store.HistoryStore;
import io.orbit.probe.CheckResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-52/BE-19/CORE-20: audit forwarding, series history and the coverage label")
class HistoryRuntimeApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    EventBus bus;
    @Autowired
    HistoryStore store;

    private final Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    @Test
    @DisplayName("every audited mutation also reaches the 30-day audit trail on disk")
    void auditForwarded() throws Exception {
        mvc.perform(put("/api/groups/grp_forwarded").header(Operators.HEADER, "Forwarding Tester")
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Forwarded\"}"))
                .andExpect(status().isOk());
        store.flush().join();

        mvc.perform(get("/api/history/audit").param("actor", "Forwarding Tester")
                        .param("from", now.minusSeconds(60).toString()).param("to", now.plusSeconds(60).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].entity").value("grp_forwarded"));
    }

    @Test
    @DisplayName("series points of a field are served raw or as rollups")
    void series() throws Exception {
        for (int i = 3; i > 0; i--) {
            bus.publish(new CheckResult("req_series", MonitorState.OK, 20, null, List.of(), null,
                    now.minusSeconds(i * 60L), Map.of("$.queue.size", 10.0 * i)));
        }
        store.flush().join();

        mvc.perform(get("/api/history/req_series/series").param("field", "$.queue.size")
                        .param("from", now.minusSeconds(3_600).toString()).param("to", now.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.field").value("$.queue.size"))
                .andExpect(jsonPath("$.resolution").value("raw"))
                .andExpect(jsonPath("$.samples", hasSize(3)))
                .andExpect(jsonPath("$.samples[0].value").value(30.0));
        mvc.perform(get("/api/history/req_series/series").param("field", "$.queue.size").param("resolution", "1m")
                        .param("from", now.minusSeconds(3_600).toString()).param("to", now.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.buckets", hasSize(3)));
    }

    @Test
    @DisplayName("the coverage carries a label in the request language")
    void coverageLabel() throws Exception {
        mvc.perform(get("/api/history/coverage")).andExpect(status().isOk())
                .andExpect(jsonPath("$.retentionDays").value(30))
                .andExpect(jsonPath("$.label", startsWith("History available")));
        mvc.perform(get("/api/history/coverage").header("Accept-Language", "pt-BR")).andExpect(status().isOk())
                .andExpect(jsonPath("$.label", startsWith("Histórico disponível")));
    }
}
