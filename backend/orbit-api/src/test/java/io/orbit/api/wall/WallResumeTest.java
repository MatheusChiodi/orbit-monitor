package io.orbit.api.wall;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("BE-38: resume from a sequence number without a full snapshot")
class WallResumeTest {

    private final ObjectMapper json = new ObjectMapper().registerModule(new JavaTimeModule());
    private final AtomicInteger snapshots = new AtomicInteger();
    private final WallSocketHandler handler = new WallSocketHandler(json, () -> {
        snapshots.incrementAndGet();
        return new WallViews.WallSnapshot(Instant.EPOCH, "Local", List.of(), List.of(), List.of(), List.of(), 100, null);
    }, 3);
    private final AtomicInteger ids = new AtomicInteger();

    private List<JsonNode> connect(String query) throws Exception {
        List<JsonNode> inbox = new CopyOnWriteArrayList<>();
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("s" + ids.incrementAndGet());
        when(session.isOpen()).thenReturn(true);
        when(session.getUri()).thenReturn(URI.create("ws://127.0.0.1/ws/wall" + (query == null ? "" : "?" + query)));
        doAnswer(inv -> {
            inbox.add(json.readTree(((TextMessage) inv.getArgument(0)).getPayload()));
            return null;
        }).when(session).sendMessage(any());
        handler.afterConnectionEstablished(session);
        return inbox;
    }

    private void event(String title) {
        handler.broadcast("event", new WallViews.TimelineEventView("evt_" + title, Instant.EPOCH, "INFO", title, ""));
    }

    @Test
    @DisplayName("a client that knows the stream and its last seq gets only the missed deltas, in order")
    void resumes() throws Exception {
        List<JsonNode> first = connect(null);
        String stream = first.getFirst().path("stream").asText();
        long seen = first.getFirst().path("seq").asLong();
        event("a");
        event("b");

        List<JsonNode> resumed = connect("stream=" + stream + "&since=" + seen);

        assertThat(resumed).extracting(n -> n.path("type").asText()).containsExactly("event", "event");
        assertThat(resumed).extracting(n -> n.path("payload").path("title").asText()).containsExactly("a", "b");
        assertThat(resumed.getFirst().path("seq").asLong()).isEqualTo(seen + 1);
        assertThat(snapshots).hasValue(1);
    }

    @Test
    @DisplayName("an up-to-date client gets nothing until the next delta")
    void upToDate() throws Exception {
        List<JsonNode> first = connect(null);
        event("a");
        long last = first.getLast().path("seq").asLong();

        List<JsonNode> resumed = connect("stream=" + first.getFirst().path("stream").asText() + "&since=" + last);
        assertThat(resumed).isEmpty();
        event("b");
        assertThat(resumed).extracting(n -> n.path("payload").path("title").asText()).containsExactly("b");
    }

    @Test
    @DisplayName("a gap older than the buffer, a future seq or another stream (restart) gets a snapshot")
    void fallsBackToSnapshot() throws Exception {
        List<JsonNode> first = connect(null);
        String stream = first.getFirst().path("stream").asText();
        long seen = first.getFirst().path("seq").asLong();
        event("a");
        event("b");
        event("c");
        event("d");

        assertThat(connect("stream=" + stream + "&since=" + seen).getFirst().path("type").asText())
                .isEqualTo("snapshot");
        assertThat(connect("stream=" + stream + "&since=999").getFirst().path("type").asText()).isEqualTo("snapshot");
        assertThat(connect("stream=other&since=" + seen).getFirst().path("type").asText()).isEqualTo("snapshot");
        assertThat(connect("stream=" + stream + "&since=abc").getFirst().path("type").asText()).isEqualTo("snapshot");
    }
}
