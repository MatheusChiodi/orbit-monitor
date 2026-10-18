package io.orbit.api.config;

import io.orbit.api.wall.WallSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/** Registers {@code /ws/wall}; only the configured origins may connect (cross-site WebSocket hijacking). */
@Configuration
@EnableWebSocket
public class WallSocketConfig implements WebSocketConfigurer {

    private final WallSocketHandler handler;
    private final OrbitProperties properties;

    public WallSocketConfig(WallSocketHandler handler, OrbitProperties properties) {
        this.handler = handler;
        this.properties = properties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler, "/ws/wall")
                .setAllowedOriginPatterns(properties.wall().allowedOrigins().toArray(String[]::new));
    }
}
