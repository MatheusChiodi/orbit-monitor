package io.orbit.api.privacy;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.orbit.api.web.Operators;
import io.orbit.history.store.HistoryStore;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * CORE-16 golden rule, end to end: a valid card number stored in a monitored database, in every shape
 * (text column, number, floating point, free text next to another number, JSON text, column alias),
 * never reaches the API, the WebSocket, the logs, the history files or the configuration files.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
@DisplayName("CORE-16 a card number never leaves the probe")
class CardDataLeakTest {

    // Public test card number (never a real card).
    private static final String TEST_PAN = "4111111111111111";
    private static final Path ROOT = tempRoot();
    private static final String H2_URL = "jdbc:h2:mem:pci-" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
    private static final String SELECT = "SELECT card_number, note, ref, amount, payload FROM payments";

    @LocalServerPort
    int port;
    @Autowired
    MockMvc mvc;
    @Autowired
    HistoryStore history;
    @Autowired
    ObjectMapper json;

    @DynamicPropertySource
    static void directories(DynamicPropertyRegistry registry) {
        registry.add("orbit.config-dir", () -> ROOT.resolve("config").toString());
        registry.add("orbit.data-dir", () -> ROOT.resolve("data").toString());
        registry.add("orbit.master-key", () -> ROOT.resolve("master.key").toString());
    }

    @BeforeAll
    static void cardholderTable() throws Exception {
        try (Connection c = DriverManager.getConnection(H2_URL, "sa", "pw"); Statement st = c.createStatement()) {
            st.execute("CREATE TABLE payments (card_number VARCHAR(19), note VARCHAR(80), ref BIGINT, "
                    + "amount DOUBLE, payload VARCHAR(200))");
            st.execute("INSERT INTO payments VALUES ('" + TEST_PAN + "', 'order 7 4111 1111 1111 1111 paid', "
                    + TEST_PAN + ", " + TEST_PAN + ".0, '{\"pan\":\"" + TEST_PAN + "\",\"id\":\"order 12 "
                    + TEST_PAN + "\"}')");
        }
    }

    @Test
    @DisplayName("API, WebSocket, logs, history and config files never carry the card number")
    void cardNumberNeverLeaks(CapturedOutput output) throws Exception {
        send(put("/api/connections/con_pci"), "{\"name\":\"PCI\",\"jdbcUrl\":\"" + H2_URL
                + "\",\"username\":\"sa\",\"password\":\"pw\",\"poolSize\":1}");
        BlockingQueue<String> wall = new LinkedBlockingQueue<>();
        WebSocketSession socket = connectWall(wall);
        List<String> leaks = new ArrayList<>();

        check(leaks, "preview", send(post("/api/monitors/preview"), "{\"type\":\"SQL\",\"connectionId\":\"con_pci\","
                + "\"sql\":\"SELECT card_number, note, ref, amount, payload, 1 AS \\\"" + TEST_PAN
                + "\\\" FROM payments\"}"));
        String saved = send(post("/api/monitors"), "{\"type\":\"SQL\",\"name\":\"Payments\",\"groupId\":\"grp_pci\","
                + "\"connectionId\":\"con_pci\",\"sql\":\"" + SELECT + "\",\"intervalSeconds\":3600,"
                + "\"timeoutSeconds\":10,\"retries\":1,"
                + "\"conditions\":[{\"field\":\"REF\",\"operator\":\"<\",\"value\":\"10\",\"level\":\"DOWN\"}],"
                + "\"fields\":[{\"field\":\"AMOUNT\",\"selected\":true,\"label\":\"Amount\",\"format\":\"number\","
                + "\"storeAsSeries\":true,\"display\":\"number\"}]}");
        check(leaks, "save", saved);
        String id = json.readTree(saved).path("definition").path("id").asText();
        assertThat(id).isNotBlank();
        check(leaks, "run", send(post("/api/monitors/" + id + "/run"), ""));
        check(leaks, "detail", body(get("/api/monitors/" + id)));
        check(leaks, "list", body(get("/api/monitors")));
        check(leaks, "wall snapshot", body(get("/api/wall/snapshot")));
        check(leaks, "incidents", body(get("/api/incidents")));
        check(leaks, "audit", body(get("/api/audit")));

        socket.close();
        String frames = String.join("\n", wall);
        assertThat(frames).as("WebSocket frames").contains("snapshot");
        check(leaks, "websocket", frames);

        history.flush().get(10, TimeUnit.SECONDS);
        Instant from = Instant.now().minus(Duration.ofDays(1));
        Instant to = Instant.now().plus(Duration.ofDays(1));
        check(leaks, "history events", String.valueOf(history.events(from, to, null, null, 1000)));
        check(leaks, "history audit", String.valueOf(history.audit(from, to, null, null, 1000)));
        check(leaks, "history samples", String.valueOf(history.raw(id, from, to)));
        check(leaks, "history series", String.valueOf(history.rawSeries(id + "/AMOUNT", from, to)));
        check(leaks, "files", filesUnder(ROOT));
        check(leaks, "logs", output.getAll());

        assertThat(leaks).as("surfaces that leaked the card number").isEmpty();
    }

    @Test
    @DisplayName("a monitor whose configuration holds a card number is rejected and never written")
    void cardNumberIsNeverStoredInConfiguration() throws Exception {
        String request = "{\"type\":\"SQL\",\"name\":\"Lookup\",\"groupId\":\"grp_pci\",\"connectionId\":\"con_pci\","
                + "\"sql\":\"SELECT COUNT(*) AS N FROM payments WHERE card_number = '" + TEST_PAN + "'\","
                + "\"intervalSeconds\":3600,\"timeoutSeconds\":10,\"retries\":1,\"conditions\":[],\"fields\":[]}";

        String problem = mvc.perform(json(post("/api/monitors"), request))
                .andExpect(status().isUnprocessableEntity())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(problem).contains("card number");
        assertThat(digits(problem)).doesNotContain(TEST_PAN);
        assertThat(digits(filesUnder(ROOT.resolve("config")))).doesNotContain(TEST_PAN);
    }

    private String send(MockHttpServletRequestBuilder builder, String body) throws Exception {
        return mvc.perform(json(builder, body)).andExpect(status().is2xxSuccessful())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    private String body(MockHttpServletRequestBuilder builder) throws Exception {
        return send(builder, "");
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder builder, String body) {
        return builder.header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private WebSocketSession connectWall(BlockingQueue<String> inbox) throws Exception {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.setOrigin("http://localhost:5173");
        return new StandardWebSocketClient().execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                inbox.add(message.getPayload());
            }
        }, headers, URI.create("ws://127.0.0.1:" + port + "/ws/wall")).get(5, TimeUnit.SECONDS);
    }

    /** Records the surface when the card number appears, ignoring spaces, hyphens and JSON escapes. */
    private static void check(List<String> leaks, String surface, String content) {
        if (digits(content).contains(TEST_PAN)) {
            leaks.add(surface);
        }
    }

    private static String digits(String content) {
        return content == null ? "" : content.replaceAll("[\\s\\-\"\\\\]", "");
    }

    private static String filesUnder(Path dir) throws IOException {
        if (!Files.exists(dir)) {
            return "";
        }
        StringBuilder all = new StringBuilder();
        try (Stream<Path> files = Files.walk(dir)) {
            for (Path file : files.filter(Files::isRegularFile).toList()) {
                all.append(file).append('\n')
                        .append(new String(Files.readAllBytes(file), StandardCharsets.ISO_8859_1)).append('\n');
            }
        }
        return all.toString();
    }

    private static Path tempRoot() {
        try {
            return Files.createTempDirectory("orbit-pci-");
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
