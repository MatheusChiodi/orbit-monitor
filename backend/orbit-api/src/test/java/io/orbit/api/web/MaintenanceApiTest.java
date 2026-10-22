package io.orbit.api.web;

import io.orbit.common.MonitorState;
import io.orbit.telemetry.Heartbeat;
import io.orbit.telemetry.TelemetryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-31 orbit.maintenance.json API, alert silencing and uptime exclusion")
class MaintenanceApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    TelemetryService telemetry;

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("windows are saved, validated, listed with their state and expanded into a calendar")
    void crud() throws Exception {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        send(put("/api/maintenance/mnt_now"), "{\"name\":\"Patch\",\"targets\":[\"mnt_sel\"],\"start\":\""
                + now.minusSeconds(600) + "\",\"end\":\"" + now.plusSeconds(3600) + "\",\"reason\":\"Oracle patch\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
        send(put("/api/maintenance/mnt_weekly"), "{\"name\":\"Weekly\",\"targets\":[\"grp_core\"],"
                + "\"cron\":\"0 2 * * SUN\",\"durationMinutes\":120,\"zone\":\"America/Sao_Paulo\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.durationMinutes").value(120));
        send(put("/api/maintenance/mnt_bad"), "{\"name\":\"Bad\",\"targets\":[]}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-config"));
        send(put("/api/maintenance/mnt_zone"), "{\"name\":\"Zone\",\"targets\":[\"x\"],\"cron\":\"0 2 * * *\","
                + "\"durationMinutes\":10,\"zone\":\"Mars/Base\"}").andExpect(status().isBadRequest());

        mvc.perform(get("/api/maintenance")).andExpect(jsonPath("$[?(@.id == 'mnt_weekly')].zone").value("America/Sao_Paulo"));
        mvc.perform(get("/api/maintenance/active")).andExpect(jsonPath("$[0].id").value("mnt_now"));
        mvc.perform(get("/api/maintenance/occurrences").param("from", now.minusSeconds(3600).toString())
                        .param("to", now.plus(8, ChronoUnit.DAYS).toString()))
                .andExpect(jsonPath("$[?(@.windowId == 'mnt_weekly')]").exists())
                .andExpect(jsonPath("$[0].windowId").value("mnt_now"));
        mvc.perform(get("/api/maintenance/occurrences").param("from", now.toString())
                .param("to", now.plus(90, ChronoUnit.DAYS).toString())).andExpect(status().isBadRequest());

        mvc.perform(delete("/api/maintenance/mnt_weekly")).andExpect(status().isNoContent());
        mvc.perform(delete("/api/maintenance/mnt_weekly")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("heartbeats inside a window are left out of the monitor's uptime")
    void uptimeExclusion() throws Exception {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        telemetry.record(new Heartbeat("mnt_up", MonitorState.OK, 10, now.minusSeconds(300)), 1);
        telemetry.record(new Heartbeat("mnt_up", MonitorState.DOWN, 0, now.minusSeconds(200)), 1);
        assertThat(telemetry.status("mnt_up").uptime().ratio()).isEqualTo(0.5);

        send(put("/api/maintenance/mnt_up_window"), "{\"name\":\"Deploy\",\"targets\":[\"mnt_up\"],\"start\":\""
                + now.minusSeconds(250) + "\",\"end\":\"" + now.minusSeconds(100) + "\"}").andExpect(status().isOk());

        assertThat(telemetry.status("mnt_up").uptime().ratio()).isEqualTo(1.0);
        assertThat(telemetry.status("mnt_up").uptime().samples()).isEqualTo(1);
    }
}
