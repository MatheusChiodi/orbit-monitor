package io.orbit.api.wall;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * {@code /ws/wall}: sends a snapshot on connect, then deltas ({@code monitor}, {@code incident},
 * {@code event}) with an increasing sequence number. The wall never polls. Clients are read-only:
 * incoming messages are ignored.
 */
public class WallSocketHandler extends TextWebSocketHandler {

    private static final Logger LOG = LoggerFactory.getLogger(WallSocketHandler.class);
    private static final int SEND_TIMEOUT_MS = 5_000;
    private static final int BUFFER_BYTES = 512 * 1024;

    private final ObjectMapper json;
    private final Supplier<WallViews.WallSnapshot> snapshot;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final AtomicLong sequence = new AtomicLong();

    public WallSocketHandler(ObjectMapper json, Supplier<WallViews.WallSnapshot> snapshot) {
        this.json = json;
        this.snapshot = snapshot;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        WebSocketSession safe = new ConcurrentWebSocketSessionDecorator(session, SEND_TIMEOUT_MS, BUFFER_BYTES);
        sessions.put(session.getId(), safe);
        send(safe, new WallViews.WallMessage("snapshot", sequence.incrementAndGet(), snapshot.get()));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // read-only channel
    }

    public void broadcast(String type, Object payload) {
        WallViews.WallMessage message = new WallViews.WallMessage(type, sequence.incrementAndGet(), payload);
        sessions.values().forEach(s -> send(s, message));
    }

    public int connections() {
        return sessions.size();
    }

    private void send(WebSocketSession session, WallViews.WallMessage message) {
        try {
            session.sendMessage(new TextMessage(json.writeValueAsString(message)));
        } catch (JsonProcessingException e) {
            LOG.warn("Could not serialize wall message {}", message.type());
        } catch (IOException | IllegalStateException e) {
            sessions.remove(session.getId());
        }
    }
}
