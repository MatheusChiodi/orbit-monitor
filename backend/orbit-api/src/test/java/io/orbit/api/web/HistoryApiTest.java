package io.orbit.api.web;

import io.orbit.api.runtime.EventBus;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import io.orbit.history.AuditRecord;
import io.orbit.history.store.HistoryStore;
import io.orbit.probe.CheckResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-52 history, events and audit query APIs")
class HistoryApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    EventBus bus;
    @Autowired
    HistoryStore store;

    private final Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    private void checks(String monitorId, int n) {
        for (int i = n; i > 0; i--) {
            boolean down = i % 5 == 0;
            bus.publish(new CheckResult(monitorId, down ? MonitorState.DOWN : MonitorState.OK, 100 + i, null,
                    List.of(), down ? "TIMEOUT: no answer in 5 s" : null, now.minusSeconds(i * 30L)));
        }
        store.flush().join();
    }

    @Test
    @DisplayName("checks published on the bus are served raw for short ranges")
    void rawHistory() throws Exception {
        checks("api-raw", 10);

        mvc.perform(get("/api/history/api-raw").param("from", now.minusSeconds(3_600).toString())
                        .param("to", now.plusSeconds(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolution").value("raw"))
                .andExpect(jsonPath("$.samples", hasSize(10)))
                .andExpect(jsonPath("$.samples[0].state").value("DOWN"))
                .andExpect(jsonPath("$.samples[0].error").value("TIMEOUT"))
                .andExpect(jsonPath("$.coverage.retentionDays").value(30));
    }

    @Test
    @DisplayName("long ranges come as rollup buckets and a summary gives uptime and p95")
    void bucketsAndSummary() throws Exception {
        checks("api-buckets", 10);

        mvc.perform(get("/api/history/api-buckets").param("from", now.minusSeconds(8 * 86_400).toString())
                        .param("to", now.plusSeconds(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolution").value("1h"))
                .andExpect(jsonPath("$.buckets[*].count").exists());
        mvc.perform(get("/api/history/api-buckets/summary").param("from", now.minusSeconds(3_600).toString())
                        .param("to", now.plusSeconds(1).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.samples").value(10))
                .andExpect(jsonPath("$.down").value(2))
                .andExpect(jsonPath("$.uptimePercent").value(80.0));
    }

    @Test
    @DisplayName("bad ranges and resolutions are rejected")
    void validation() throws Exception {
        mvc.perform(get("/api/history/x").param("from", "yesterday")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/history/x").param("resolution", "5m")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/history/x").param("from", now.minusSeconds(40 * 86_400).toString()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("state changes and incident steps are listed as events and the audit trail is read from disk")
    void eventsAndAudit() throws Exception {
        bus.publish(new MonitorStateChanged("api-events", MonitorState.OK, MonitorState.DOWN, now, now));
        store.record(new AuditRecord(now, "Ana", "monitor.update", "monitor:api-events", "token=abc123"));
        store.flush().join();

        mvc.perform(get("/api/events").param("monitorId", "api-events").param("type", "state.change")
                        .param("from", now.minusSeconds(60).toString()).param("to", now.plusSeconds(60).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].detail").value("OK -> DOWN"));
        mvc.perform(get("/api/events").param("monitorId", "api-events").param("type", "incident.opened")
                        .param("from", now.minusSeconds(60).toString()).param("to", now.plusSeconds(60).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
        MvcResult audit = mvc.perform(get("/api/history/audit").param("actor", "Ana")
                        .param("entity", "monitor:api-events").param("from", now.minusSeconds(60).toString()).param("to", now.plusSeconds(60).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andReturn();
        assertThat(audit.getResponse().getContentAsString()).doesNotContain("abc123");
    }

    @Test
    @DisplayName("exports stream raw samples as CSV")
    void csvExport() throws Exception {
        checks("api-export", 3);

        MvcResult started = mvc.perform(get("/api/history/api-export/export")
                        .param("from", now.minusSeconds(3_600).toString()).param("to", now.plusSeconds(1).toString()))
                .andExpect(request().asyncStarted())
                .andReturn();
        mvc.perform(asyncDispatch(started))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(result -> assertThat(result.getResponse().getContentAsString())
                        .startsWith("at,state,latencyMs,value,error\n")
                        .contains(",OK,"));
    }

    @Test
    @DisplayName("coverage reports the retention window")
    void coverage() throws Exception {
        mvc.perform(get("/api/history/coverage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retentionDays").value(30))
                .andExpect(jsonPath("$.rawWritesEnabled").value(true));
    }
}
