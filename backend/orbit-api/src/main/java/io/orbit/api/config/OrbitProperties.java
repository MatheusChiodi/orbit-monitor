package io.orbit.api.config;

import io.orbit.security.access.AccessMode;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

/**
 * Runtime settings of the local process ({@code orbit.*} in application.yml or environment).
 *
 * @param configDir   directory of the orbit.&lt;feature&gt;.json files
 * @param masterKey   AES key file, never inside {@code configDir}
 * @param history     how long heartbeats, incidents and audit entries stay in memory
 * @param workers     concurrent checks
 * @param environment label shown on the wall
 */
@ConfigurationProperties(prefix = "orbit")
public record OrbitProperties(
        Path configDir,
        Path masterKey,
        Duration history,
        int workers,
        String environment,
        Access access,
        Http http,
        Wall wall) {

    public OrbitProperties {
        history = history == null ? Duration.ofHours(24) : history;
        workers = workers <= 0 ? 4 : workers;
        environment = environment == null ? "Local" : environment;
        access = access == null ? new Access(AccessMode.LOOPBACK, List.of(), true) : access;
        http = http == null ? new Http(List.of(), false) : http;
        wall = wall == null ? new Wall(List.of("http://localhost:[*]", "http://127.0.0.1:[*]")) : wall;
    }

    /** Who may change configuration; see AccessPolicy. */
    public record Access(AccessMode mode, List<String> cidrs, boolean lanAcknowledge) {
        public Access {
            mode = mode == null ? AccessMode.LOOPBACK : mode;
            cidrs = cidrs == null ? List.of() : List.copyOf(cidrs);
        }
    }

    /**
     * HTTP probe target policy: private ranges are reachable unless {@code blockPrivate}; the allowlist
     * (host names or CIDR ranges) reopens them. Cloud metadata is always blocked.
     */
    public record Http(List<String> allowlist, boolean blockPrivate) {
        public Http {
            allowlist = allowlist == null ? List.of() : List.copyOf(allowlist);
        }
    }

    /** Origins allowed to open the wall WebSocket (protects against cross-site WebSocket hijacking). */
    public record Wall(List<String> allowedOrigins) {
        public Wall {
            allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        }
    }
}
