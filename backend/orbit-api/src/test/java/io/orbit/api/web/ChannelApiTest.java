package io.orbit.api.web;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.sun.net.httpserver.HttpServer;
import io.orbit.alerting.IncidentService;
import io.orbit.api.config.OrbitProperties;
import io.orbit.common.MonitorState;
import io.orbit.common.event.MonitorStateChanged;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
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
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext
@DisplayName("BE-28 e-mail, Telegram and WhatsApp channels end to end; secrets and recipients never returned")
class ChannelApiTest {

    private static final String BOT_TOKEN = "987654:telegram-bot-token";

    @RegisterExtension
    static final GreenMailExtension SMTP = new GreenMailExtension(ServerSetupTest.SMTP);

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;
    @Autowired
    IncidentService incidents;

    private HttpServer server;
    private final List<String> received = new CopyOnWriteArrayList<>();
    private String base;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/", ex -> {
            received.add(ex.getRequestURI().getPath() + "|" + ex.getRequestHeaders().getFirst("Authorization") + "|"
                    + new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            ex.sendResponseHeaders(200, -1);
            ex.close();
        });
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private ResultActions send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(builder.header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("a Telegram channel delivers incidents in pt-BR; the token and chat id are masked in the API")
    void telegram() throws Exception {
        send(put("/api/channels/chn_tg"), "{\"name\":\"NOC\",\"type\":\"TELEGRAM\",\"url\":\"" + base
                + "\",\"token\":\"" + BOT_TOKEN + "\",\"recipients\":[\"-1009876543210\"],\"minSeverity\":\"WARN\","
                + "\"locale\":\"pt-BR\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("•••• (vault)"))
                .andExpect(jsonPath("$.recipients[0]").value("••••3210"));
        assertThat(Files.readString(properties.configDir().resolve("orbit.channels.json")))
                .doesNotContain(BOT_TOKEN, base);

        Instant now = Instant.now();
        incidents.onStateChanged(new MonitorStateChanged("tg_monitor", MonitorState.OK, MonitorState.DOWN, now, now));

        assertThat(received).anySatisfy(r -> assertThat(r)
                .startsWith("/bot" + BOT_TOKEN + "/sendMessage")
                .contains("\"chat_id\":\"-1009876543210\"", "tg_monitor está fora do ar"));
        send(put("/api/channels/chn_tg"), "{\"name\":\"NOC renamed\",\"type\":\"TELEGRAM\",\"minSeverity\":\"WARN\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipients[0]").value("••••3210"));
    }

    @Test
    @DisplayName("a WhatsApp provider channel sends the bearer token; the test endpoint reports the result")
    void whatsappAndTest() throws Exception {
        send(put("/api/channels/chn_wa"), "{\"name\":\"Manager\",\"type\":\"WHATSAPP\",\"url\":\"" + base
                + "/v21.0/123/messages\",\"token\":\"wa-secret\",\"recipients\":[\"+5511912345678\"],\"locale\":\"en\"}")
                .andExpect(status().isOk());
        send(post("/api/channels/chn_wa/test"), "{}").andExpect(status().isOk())
                .andExpect(jsonPath("$.delivered").value(true));
        assertThat(received).anySatisfy(r -> assertThat(r).startsWith("/v21.0/123/messages|Bearer wa-secret|")
                .contains("Orbit test notification", "+5511912345678"));

        send(put("/api/channels/chn_wa_bad"), "{\"name\":\"Bad\",\"type\":\"WHATSAPP\",\"token\":\"t\","
                + "\"recipients\":[\"5511\"]}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("invalid-config"));
        send(put("/api/channels/chn_down"), "{\"name\":\"Down\",\"type\":\"WEBHOOK\",\"url\":\"http://127.0.0.1:1/x\"}")
                .andExpect(status().isOk());
        send(post("/api/channels/chn_down/test"), "{}").andExpect(status().isOk())
                .andExpect(jsonPath("$.delivered").value(false))
                .andExpect(jsonPath("$.error").isString());
        send(post("/api/channels/chn_nope/test"), "{}").andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("an e-mail channel sends through SMTP; the password and addresses are masked in the API")
    void email() throws Exception {
        send(put("/api/channels/chn_mail"), "{\"name\":\"On-call\",\"type\":\"EMAIL\",\"token\":\"smtp-pass\","
                + "\"recipients\":[\"oncall@example.com\"],\"smtp\":{\"host\":\"127.0.0.1\",\"port\":"
                + SMTP.getSmtp().getPort() + ",\"from\":\"orbit@example.com\",\"security\":\"NONE\"}}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("•••• (vault)"))
                .andExpect(jsonPath("$.recipients[0]").value("o•••@e•••.com"))
                .andExpect(jsonPath("$.smtp.host").value("127.0.0.1"));
        send(post("/api/channels/chn_mail/test"), "{}").andExpect(jsonPath("$.delivered").value(true));
        assertThat(SMTP.getReceivedMessages()).singleElement()
                .satisfies(m -> assertThat(m.getSubject()).isEqualTo("Orbit test notification"));
        mvc.perform(get("/api/channels")).andExpect(jsonPath("$[?(@.id == 'chn_mail')].token").value("•••• (vault)"));
    }
}
