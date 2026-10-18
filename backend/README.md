# Orbit Monitor — backend

Java 21 + Spring Boot 3, Maven multi-module. Local-first: no Orbit database, no login. Configuration lives in
one `orbit.<feature>.json` per feature (`~/.orbit/config`), runtime history in memory (24 h).

## Modules

| Module | What it holds |
|---|---|
| `orbit-common` | `MonitorState`, domain events, `OperatorName`, `Cidr`, sensitive-data detection and masking |
| `orbit-config` | `ConfigFile<T>`: versioned JSON file, validation, atomic write, `.bak`, reload on external edit |
| `orbit-security` | Network access policy, AES-256-GCM vault (`master.key`, `SecretRef`), masked audit trail |
| `orbit-monitor` | Gatus-style conditions, hysteresis, SELECT safe mode, row-limit wrapper, read-mode suggestion, monitor definitions |
| `orbit-probe` | `HttpProbe` (SSRF protection), `SqlProbe` (read-only), `CheckRunner` (probe boundary redaction), scheduler + workers |
| `orbit-telemetry` | Heartbeat ring buffers, confirmed state with retries, uptime, percentiles, per-minute series |
| `orbit-alerting` | Incident lifecycle: open, severity, resolve, reopen, acknowledge, comment, ticket |
| `orbit-workspace` | Groups and the worst-state rule |
| `orbit-api` | Spring Boot app: wiring, REST `/api`, WebSocket `/ws/wall`, access filter, Problem Details |

## Run

```bash
cd backend
./mvnw -pl orbit-api -am spring-boot:run        # http://127.0.0.1:8080
# or
./mvnw package -DskipTests && java -jar orbit-api/target/orbit-api.jar
```

Settings (environment variables or `--orbit.*`): `ORBIT_CONFIG_DIR`, `ORBIT_MASTER_KEY`, `ORBIT_BIND_ADDRESS`
(default `127.0.0.1`), `ORBIT_PORT`, `orbit.access.mode` (`LOOPBACK` | `LAN` | `CIDR`), `orbit.http.allowlist`
(hosts/CIDRs the HTTP probe may reach although internal), `orbit.wall.allowed-origins`.

Changes need the `X-Orbit-Operator: <your name>` header. OpenAPI: `/v3/api-docs`, UI at `/swagger-ui.html`.
Example config files: `config-examples/` (never commit real `orbit.*.json` files or `master.key`).

## Test

```bash
./mvnw test             # default run (tests tagged "pending" are excluded)
./mvnw test -Ppending   # only the pending tests
```

Unit tests use JUnit 5, AssertJ and Mockito; SQL probe and runtime tests use in-memory H2; API tests use MockMvc
and a real WebSocket client. Tests write config and keys to a temporary directory, never to `~/.orbit`.
