package io.orbit.api.web;

import com.jayway.jsonpath.JsonPath;
import com.sun.net.httpserver.HttpServer;
import io.orbit.api.config.OrbitProperties;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("BE-04/05/07/08/09/10/11/17/18 monitors over the API and in the running runtime")
class ExtendedMonitorsApiTest {

    private static final HttpServer SERVER = start();
    private static final List<String> SEEN = new CopyOnWriteArrayList<>();

    @Autowired
    MockMvc mvc;
    @Autowired
    OrbitProperties properties;

    private static HttpServer start() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            server.createContext("/rdap/domain/", ex -> respond(ex, 200,
                    "{\"events\":[{\"eventAction\":\"expiration\",\"eventDate\":\"2099-01-01T00:00:00Z\"}]}"));
            server.createContext("/token", ex -> {
                SEEN.add("token " + ex.getRequestHeaders().getFirst("Authorization"));
                respond(ex, 200, "{\"access_token\":\"oauth-tok\",\"expires_in\":600}");
            });
            server.createContext("/login", ex -> respond(ex, 200, "{\"session\":\"sess-42\"}"));
            server.createContext("/api", ex -> {
                SEEN.add("api " + ex.getRequestHeaders().getFirst("Authorization") + " "
                        + ex.getRequestHeaders().getFirst("X-Session"));
                respond(ex, 200, "{\"queue\":{\"size\":17}}");
            });
            server.start();
            return server;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void respond(com.sun.net.httpserver.HttpExchange ex, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.close();
    }

    private static String base() {
        return "http://localhost:" + SERVER.getAddress().getPort();
    }

    @DynamicPropertySource
    static void rdap(DynamicPropertyRegistry registry) {
        registry.add("orbit.rdap.base-url", () -> base() + "/rdap/domain/");
    }

    @AfterAll
    static void stop() {
        SERVER.stop(0);
    }

    private String save(String json) throws Exception {
        return mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                .content(json)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    @Test
    @DisplayName("BE-05: a domain expiry check runs through RDAP and exposes [CERT_DAYS_LEFT]")
    void certificate() throws Exception {
        String created = save("{\"type\":\"CERT\",\"name\":\"Domain\",\"probe\":{\"domain\":\"example.com\"},"
                + "\"intervalSeconds\":3600,\"timeoutSeconds\":5,"
                + "\"conditions\":[{\"expression\":\"[CERT_DAYS_LEFT] > 30\",\"level\":\"WARN\"}]}");
        String id = JsonPath.read(created, "$.definition.id");
        assertThat(id).startsWith("cert_");

        mvc.perform(post("/api/monitors/" + id + "/run").header(Operators.HEADER, "Ana"))
                .andExpect(jsonPath("$.state").value("OK"))
                .andExpect(jsonPath("$.payload.DOMAIN_DAYS_LEFT").isNumber())
                .andExpect(jsonPath("$.conditions[0].passed").value(true));
        mvc.perform(get("/api/monitors/" + id)).andExpect(jsonPath("$.status.type").value("CERT"));
    }

    @Test
    @DisplayName("BE-04/09/10: DNS, gRPC and Kafka checks are created with their settings")
    void dnsGrpcKafka() throws Exception {
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"DNS\",\"name\":\"API A record\",\"host\":\"api.example.com\","
                                + "\"probe\":{\"recordType\":\"A\",\"expected\":\"93.184.216.34\"},"
                                + "\"intervalSeconds\":60}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.definition.probe.recordType").value("A"));
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"GRPC\",\"name\":\"Orders\",\"host\":\"127.0.0.1\",\"port\":50051,"
                                + "\"probe\":{\"service\":\"orders.v1.Orders\"},\"intervalSeconds\":60}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status.type").value("GRPC"));
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"KAFKA\",\"name\":\"Billing lag\",\"probe\":{\"bootstrapServers\":"
                                + "\"127.0.0.1:9092\",\"consumerGroup\":\"billing\",\"topic\":\"invoices\"},"
                                + "\"intervalSeconds\":60,\"conditions\":[{\"expression\":\"[COL].LAG < 1000\"}]}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.definition.probe.topic").value("invoices"));
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"DNS\",\"name\":\"Bad\",\"host\":\"x\",\"probe\":{\"recordType\":\"SOA\"}}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("BE-07/08/23: steps and OAuth2 run in order; the client secret is sealed and never returned")
    void stepsAndOAuth() throws Exception {
        String created = save("{\"type\":\"HTTP\",\"name\":\"Orders API\",\"method\":\"GET\",\"url\":\"" + base()
                + "/api/orders\",\"headers\":{\"X-Session\":\"${login.session}\"},\"intervalSeconds\":60,"
                + "\"steps\":[{\"name\":\"login\",\"method\":\"POST\",\"url\":\"" + base() + "/login\","
                + "\"extract\":{\"session\":\"$.session\"}}],"
                + "\"oauth\":{\"tokenUrl\":\"" + base() + "/token\",\"clientId\":\"orbit\","
                + "\"clientSecret\":\"client-s3cret\",\"scope\":\"read\"},"
                + "\"fields\":[{\"field\":\"$.queue.size\",\"selected\":true,\"storeAsSeries\":true}],"
                + "\"conditions\":[{\"expression\":\"[BODY].queue.size < 100\"}]}");
        String id = JsonPath.read(created, "$.definition.id");
        assertThat(JsonPath.<String>read(created, "$.definition.oauth.clientSecret")).isEqualTo("•••• (vault)");
        assertThat(created).doesNotContain("client-s3cret");
        assertThat(Files.readString(properties.configDir().resolve("orbit.requests.json")))
                .doesNotContain("client-s3cret");

        mvc.perform(post("/api/monitors/" + id + "/run").header(Operators.HEADER, "Ana"))
                .andExpect(jsonPath("$.state").value("OK"));
        assertThat(SEEN).anyMatch(s -> s.startsWith("token Basic "));
        assertThat(SEEN).contains("api Bearer oauth-tok sess-42");

        String again = save("{\"id\":\"" + id + "\",\"type\":\"HTTP\",\"name\":\"Orders API\",\"url\":\"" + base()
                + "/api/orders\",\"oauth\":{\"tokenUrl\":\"" + base() + "/token\",\"clientId\":\"orbit\","
                + "\"clientSecret\":\"•••• (vault)\"}}");
        assertThat(JsonPath.<String>read(again, "$.definition.oauth.clientSecret")).isEqualTo("•••• (vault)");
        mvc.perform(post("/api/monitors/" + id + "/run").header(Operators.HEADER, "Ana"))
                .andExpect(jsonPath("$.state").value("OK"));
    }

    @Test
    @DisplayName("BE-17/18: window and retry are stored with the monitor")
    void windowAndRetry() throws Exception {
        String created = save("{\"type\":\"TCP\",\"name\":\"Business hours\",\"host\":\"127.0.0.1\",\"port\":1,"
                + "\"window\":{\"days\":[\"MONDAY\",\"TUESDAY\"],\"from\":\"08:00\",\"to\":\"18:00\","
                + "\"zone\":\"America/Sao_Paulo\"},\"retry\":{\"attempts\":2,\"initialDelayMs\":0}}");
        assertThat(JsonPath.<String>read(created, "$.definition.window.zone")).isEqualTo("America/Sao_Paulo");
        assertThat(JsonPath.<Integer>read(created, "$.definition.retry.attempts")).isEqualTo(2);
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"TCP\",\"name\":\"Bad retry\",\"host\":\"127.0.0.1\",\"port\":1,"
                        + "\"retry\":{\"attempts\":9}}")).andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("CORE-15: validation errors follow Accept-Language")
    void localizedErrors() throws Exception {
        mvc.perform(post("/api/monitors").header(Operators.HEADER, "Ana").header("Accept-Language", "pt-BR")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"tcp_pt\",\"type\":\"TCP\",\"name\":\"Porta\",\"host\":\"db\","
                                + "\"port\":70000}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors[0]").value("tcp_pt: a porta deve estar entre 1 e 65535"));
    }
}
