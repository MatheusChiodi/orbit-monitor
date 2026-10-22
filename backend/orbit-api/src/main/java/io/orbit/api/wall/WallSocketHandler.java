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
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * {@code /ws/wall}: sends a snapshot on connect, then deltas ({@code monitor}, {@code incident},
 * {@code event}) with an increasing sequence number. The wall never polls. Clients are read-only:
 * incoming messages are ignored.
 *
 * <p>BE-38: every message carries the {@code stream} id of this server run. A snapshot is the state
 * as of its {@code seq} (it does not consume a number, so other clients never see a gap). A client
 * that reconnects with {@code ?stream=<id>&since=<seq>} gets only the deltas it missed, in order,
 * when they are still in the replay buffer; otherwise (restart, gap too old, bad value) a snapshot.
 */
public class WallSocketHandler extends TextWebSocketHandler {

    private static final Logger LOG = LoggerFactory.getLogger(WallSocketHandler.class);
    private static final int SEND_TIMEOUT_MS = 5_000;
    private static final int BUFFER_BYTES = 512 * 1024;
    private static final int DEFAULT_REPLAY = 1_000;

    private record Sent(long seq, String text) {
    }

    private final ObjectMapper json;
    private final Supplier<WallViews.WallSnapshot> snapshot;
    private final int replayLimit;
    private final String stream = UUID.randomUUID().toString();
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Deque<Sent> replay = new ArrayDeque<>();
    private long sequence;

    public WallSocketHandler(ObjectMapper json, Supplier<WallViews.WallSnapshot> snapshot) {
        this(json, snapshot, DEFAULT_REPLAY);
    }

    /** @param replayLimit deltas kept for resuming clients */
    public WallSocketHandler(ObjectMapper json, Supplier<WallViews.WallSnapshot> snapshot, int replayLimit) {
        this.json = json;
        this.snapshot = snapshot;
        this.replayLimit = replayLimit;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        WebSocketSession safe = new ConcurrentWebSocketSessionDecorator(session, SEND_TIMEOUT_MS, BUFFER_BYTES);
        Long since = resumePoint(session.getUri());
        // The snapshot is built outside the lock; a delta published meanwhile is replayed after it
        // (at worst a client applies a delta its snapshot already contains, never misses one).
        long before = since == null ? currentSequence() : since;
        WallViews.WallSnapshot state = since == null ? snapshot.get() : null;
        synchronized (this) {
            if (since == null) {
                send(safe, new WallViews.WallMessage("snapshot", before, stream, state));
            }
            long from = before;
            for (Sent sent : replay) {
                if (sent.seq() > from) {
                    send(safe, sent.text());
                }
            }
            sessions.put(session.getId(), safe);
        }
    }

    /** The seq to resume after, or null when a snapshot is needed. */
    private synchronized Long resumePoint(URI uri) {
        if (uri == null) {
            return null;
        }
        Map<String, List<String>> query = UriComponentsBuilder.fromUri(uri).build().getQueryParams();
        String clientStream = first(query, "stream");
        String since = first(query, "since");
        if (!stream.equals(clientStream) || since == null) {
            return null;
        }
        long seq;
        try {
            seq = Long.parseLong(since);
        } catch (NumberFormatException e) {
            return null;
        }
        long oldest = replay.isEmpty() ? sequence + 1 : replay.peekFirst().seq();
        // Resumable when every delta after seq is still buffered and seq is not in the future.
        return seq <= sequence && seq >= oldest - 1 ? seq : null;
    }

    private synchronized long currentSequence() {
        return sequence;
    }

    private static String first(Map<String, List<String>> query, String name) {
        List<String> values = query.get(name);
        return values == null || values.isEmpty() ? null : values.getFirst();
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // read-only channel
    }

    public synchronized void broadcast(String type, Object payload) {
        WallViews.WallMessage message = new WallViews.WallMessage(type, ++sequence, stream, payload);
        String text;
        try {
            text = json.writeValueAsString(message);
        } catch (JsonProcessingException e) {
            LOG.warn("Could not serialize wall message {}", type);
            return;
        }
        replay.addLast(new Sent(message.seq(), text));
        while (replay.size() > replayLimit) {
            replay.removeFirst();
        }
        sessions.values().forEach(s -> send(s, text));
    }

    public int connections() {
        return sessions.size();
    }

    /** Id of this server run; a client resuming with another id gets a snapshot. */
    public String stream() {
        return stream;
    }

    private void send(WebSocketSession session, WallViews.WallMessage message) {
        try {
            send(session, json.writeValueAsString(message));
        } catch (JsonProcessingException e) {
            LOG.warn("Could not serialize wall message {}", message.type());
        }
    }

    private void send(WebSocketSession session, String text) {
        try {
            session.sendMessage(new TextMessage(text));
        } catch (IOException | IllegalStateException e) {
            sessions.remove(session.getId());
        }
    }
}
