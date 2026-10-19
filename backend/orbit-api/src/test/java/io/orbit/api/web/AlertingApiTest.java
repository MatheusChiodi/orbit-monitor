package io.orbit.api.web;

import com.sun.net.httpserver.HttpServer;
import io.orbit.api.config.OrbitProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
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

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-28 channels, BE-32 silences and incident notifications end to end")
class AlertingApiTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;

    private HttpServer server;
    private final List<String> received = new CopyOnWriteArrayList<>();
    private String hookUrl;

    @BeforeEach
    void startWebhook() throws Exception {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/hook", ex -> {
            received.add(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)
                    + "|sig=" + ex.getRequestHeaders().getFirst("X-Orbit-Signature"));
            ex.sendResponseHeaders(204, -1);
            ex.close();
        });
        server.start();
        hookUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/hook";
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private void brokenMonitor(String id) throws Exception {
        send(put("/api/connections/con_alert"), "{\"name\":\"H2\",\"jdbcUrl\":\"jdbc:h2:mem:alert;DB_CLOSE_DELAY=-1\","
                + "\"username\":\"sa\",\"password\":\"pw\",\"poolSize\":1}").andExpect(status().isOk());
        send(post("/api/monitors"), "{\"id\":\"" + id + "\",\"type\":\"SQL\",\"name\":\"Broken\",\"connectionId\":\"con_alert\","
                + "\"sql\":\"SELECT 1 AS ONE\",\"intervalSeconds\":3600,\"timeoutSeconds\":5,\"retries\":1,"
                + "\"conditions\":[{\"expression\":\"[COL].ONE == 2\",\"level\":\"DOWN\"}]}").andExpect(status().isOk());
    }

    /** The scheduler may run the new monitor in the background first; give its delivery a moment. */
    private void awaitDelivery() throws InterruptedException {
        for (int i = 0; i < 50 && received.isEmpty(); i++) {
            Thread.sleep(100);
        }
    }

    @Test
    @DisplayName("a signed webhook receives the incident; the URL and secret are never returned")
    void webhookOnIncident() throws Exception {
        send(put("/api/channels/chn_hook"), "{\"name\":\"Ticketing\",\"type\":\"WEBHOOK\",\"url\":\"" + hookUrl
                + "\",\"signingSecret\":\"whsec\",\"minSeverity\":\"DOWN\",\"enabled\":true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("•••• (vault)"));
        assertThat(Files.readString(properties.configDir().resolve("orbit.channels.json"))).doesNotContain(hookUrl, "whsec");

        brokenMonitor("sel_alert");
        send(post("/api/monitors/sel_alert/run"), "").andExpect(jsonPath("$.state").value("DOWN"));

        awaitDelivery();
        assertThat(received).singleElement().satisfies(r -> assertThat(r).contains("Broken is down", "sha256="));
        mvc.perform(get("/api/channels")).andExpect(jsonPath("$[0].url").value("•••• (vault)"));
    }

    @Test
    @DisplayName("a silenced monitor opens the incident but sends nothing")
    void silenced() throws Exception {
        send(put("/api/channels/chn_hook2"), "{\"name\":\"Hook\",\"type\":\"WEBHOOK\",\"url\":\"" + hookUrl
                + "\",\"minSeverity\":\"WARN\",\"enabled\":true}").andExpect(status().isOk());
        brokenMonitor("sel_quiet");
        send(post("/api/silences"), "{\"target\":\"sel_quiet\",\"reason\":\"Known issue\",\"minutes\":60}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdBy").value("Ana"));

        send(post("/api/monitors/sel_quiet/run"), "").andExpect(jsonPath("$.state").value("DOWN"));

        assertThat(received).isEmpty();
        mvc.perform(get("/api/incidents")).andExpect(jsonPath("$[?(@.monitorId == 'sel_quiet')]").exists());
        mvc.perform(get("/api/silences")).andExpect(jsonPath("$[0].target").value("sel_quiet"));
        mvc.perform(delete("/api/channels/chn_hook2").header(Operators.HEADER, "Ana")).andExpect(status().isNoContent());
    }
}
