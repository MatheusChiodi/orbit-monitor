package io.orbit.api.wall;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WallSocketTest {

    @LocalServerPort
    int port;
    @Autowired
    WallSocketHandler handler;
    @Autowired
    ObjectMapper json;

    private WebSocketSession connect(String origin, BlockingQueue<String> inbox) throws Exception {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.setOrigin(origin);
        return new StandardWebSocketClient().execute(new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                inbox.add(message.getPayload());
            }
        }, headers, URI.create("ws://127.0.0.1:" + port + "/ws/wall")).get(5, TimeUnit.SECONDS);
    }

    @Test
    void sendsSnapshotOnConnectThenDeltasWithIncreasingSequence() throws Exception {
        BlockingQueue<String> inbox = new LinkedBlockingQueue<>();
        WebSocketSession session = connect("http://localhost:5173", inbox);

        JsonNode snapshot = json.readTree(inbox.poll(5, TimeUnit.SECONDS));
        assertThat(snapshot.path("type").asText()).isEqualTo("snapshot");
        assertThat(snapshot.path("payload").path("monitors").isArray()).isTrue();
        assertThat(snapshot.path("payload").path("generatedAt").asText()).endsWith("Z");

        handler.broadcast("event", new WallViews.TimelineEventView("evt_x", null, "INFO", "hello", ""));
        JsonNode event = json.readTree(inbox.poll(5, TimeUnit.SECONDS));
        assertThat(event.path("type").asText()).isEqualTo("event");
        assertThat(event.path("seq").asLong()).isGreaterThan(snapshot.path("seq").asLong());
        session.close();
    }

    @Test
    void foreignOriginsAreRejected() {
        assertThatThrownBy(() -> connect("https://evil.example.com", new LinkedBlockingQueue<>()))
                .isInstanceOf(Exception.class);
    }
}
