# Orbit Monitor — Architecture

Stack: **Java 21 + Spring Boot 3** on the backend, **React 19 + Vite + TypeScript + Tailwind CSS v4 + Motion** on the frontend. Orbit is **local-first**: it runs on the operator's machine, has **no database of its own** and **no login**, keeps configuration in per-feature JSON files and runtime data in memory. The only database access is the read-only SELECTs against monitored databases (Oracle 11g, Postgres, SQL Server, MySQL).

```
┌──────────────┐   HTTP / WS   ┌──────────────────────────────────────────────┐
│  Wall / Web  │ ───────────▶  │ Local HTTP/WS server (127.0.0.1:8080)        │
│ (React/Vite) │ ◀───────────  │  access policy · rate limit · flag → domain  │
└──────────────┘               └───────────────┬──────────────────────────────┘
                                               ▼
                               ┌──────────────────────────────┐
                               │ Security (main domain)       │
                               │ AccessPolicy · AppRouter     │
                               │ Vault · Audit · Privacy      │
                               └───────────────┬──────────────┘
                 ┌────────────┬────────────────┼────────────────┬─────────────┐
                 ▼            ▼                ▼                ▼             ▼
            Workspace      Monitor           Probe          Telemetry     Alerting
            groups/tags    definitions    scheduler +      heartbeats     rules,
            layouts        conditions     executors        series, SLA    channels,
                                          (http/sql)       rollups        incidents
                                               │
                                               ▼
                               ┌──────────────────────────────┐
                               │ Targets: sites, APIs, DBs    │
                               │ local or online, read-only   │
                               └──────────────────────────────┘
```

## 1. Domains (backend)

Each domain is its own Maven module (`orbit-<domain>`), with an internal API through interfaces and events; no calls between repositories of different domains. Every request enters through the local server with a **flag** (`X-Orbit-Route: monitor.create`) that Security validates and the Router dispatches.

| Domain | Subdomains | Responsibility | Config files / runtime |
|---|---|---|---|
| **Security** | access, vault, audit, privacy | **No login.** Network access policy (who may edit vs. only view), credential vault (AES-256-GCM, key in `~/.orbit/master.key`, outside the config directory), audit trail of every mutation, sensitive data redaction | `orbit.settings.json`; audit in memory + JSON log |
| **Workspace** | group, tag, layout | Groups, tags, ordering and **wall layout** (what appears, where and how) | `orbit.groups.json`, `orbit.dependencies.json`, `orbit.layouts.json`, `orbit.themes.json`, `orbit.variables.json` |
| **Monitor** | http, sql, condition | Definition of each monitor and its health conditions; SELECT validation; column discovery | `orbit.requests.json`, `orbit.selects.json`, `orbit.checks.json`, `orbit.connections.json`, `orbit.query-catalog.json` |
| **Probe** | scheduler, executor, sandbox | Schedules and runs checks with isolation, timeout and a per-target circuit breaker | in memory |
| **Telemetry** | heartbeat, series, rollup | Keeps the last hour in memory and the last 30 days on disk, computes state with hysteresis, per-minute/hour/day series, uptime and p95 | in memory + 30-day segmented log in `~/.orbit/data/` ([08-logs-and-history.md](08-logs-and-history.md)) |
| **Alerting** | rule, channel, incident, escalation | Opens/closes incidents, acknowledgement, time-based escalation, delivery via email/Teams/Slack/webhook | `orbit.channels.json`, `orbit.escalation.json`, `orbit.oncall.json`, `orbit.maintenance.json`, `orbit.silences.json`; incidents in memory |

### Flow of a check

1. `Probe.scheduler` (`@Scheduled` with a local lock) enqueues `ProbeJob(monitorId)` at the monitor's interval.
2. A `ProbeExecutor` (Java 21 virtual-thread pool) picks up the job and calls `HttpProbe` or `SqlProbe`.
3. The executor returns `ProbeResult { status, latencyMs, payload, error }`.
4. `Telemetry` appends the heartbeat to the history log, evaluates the **conditions**, applies hysteresis and emits `MonitorStateChanged` if the state changed.
5. `Alerting` reacts to the event: opens an incident, fires channels, starts the escalation clock.
6. The local server publishes the new state over the **WebSocket** `/ws/wall`; the wall updates without polling.

### SQL probe (the heart of the product)

```
Incoming SELECT ──▶ Parser (JSqlParser) ──▶ accepts only SELECT/WITH, no multiple ;,
                                           no DML/DDL/CALL/EXEC, no DBMS_*/pg_sleep
            ──▶ Wrapper: SELECT * FROM (<sql>) WHERE ROWNUM <= :max   (Oracle)
                         SELECT * FROM (<sql>) t LIMIT :max           (Postgres/MySQL)
            ──▶ Runs with statement timeout + fetchSize + READ ONLY user
            ──▶ ResultSetMetaData → columns, types → ResultPayload {columns, rows, ms}
```

* Each **Connection** (target) has its own pool (HikariCP, max 2–3) so the monitor never exhausts the database it observes.
* Circuit breaker (Resilience4j) per target: 3 consecutive failures = 1-minute pause with a "no response" state.
* Outbound guard in `HttpProbe`: cloud metadata endpoints (`169.254.169.254`, `fd00:ec2::254`, …) are always blocked; private ranges are allowed by default because Orbit runs on the operator's own machine and only loopback can edit monitors (`orbit.http.block-private=true` blocks them).

### Condition evaluation

Conditions are short expressions evaluated against the result, Gatus-style:

```
[STATUS] == 200
[RESPONSE_TIME] < 800ms
[BODY].status == "UP"            (JSONPath)
[ROWS] == 0
[COL].PENDING_QTY < 50
[COL].LAST_BATCH_AT > now() - 60min
[EXEC_TIME] < 2s
```

Implemented as small `ConditionEvaluator`s registered in a `Map<Operator, Evaluator>`, with no scripting engine. Resulting state: `OK`, `WARN` (latency/soft threshold), `DOWN` (a critical condition failed or no response). Configurable hysteresis (default 10%) to leave WARN.

## 2. Frontend

```
src/
  app/            routing, providers, theme
  domains/
    security/     access mode (edit / view-only)
    workspace/    groups, tags, wall layout editor
    monitor/      HTTP and SQL forms, SELECT preview, conditions
    telemetry/    charts, series, uptime
    alerting/     incidents, acknowledgement, channels
    wall/         the wall screen (hero, headroom, matrix, timeline)
  shared/
    ui/           Button, Panel, Badge, Sparkline, ThresholdChart…
    api/          typed HTTP client (openapi-typescript) + WebSocket
    motion/       Motion variants and transitions
```

* **One component per folder** (`Component/Component.tsx`, `.test.tsx`, `index.ts`), files up to 400 lines, strict TypeScript with no `any`.
* Server state with **TanStack Query**; wall state in a lightweight store (Zustand) fed by the WebSocket.
* Custom canvas charts for the hero (as in the prototype) and **Recharts** on the analysis screens.
* **Motion** (formerly Framer Motion) only where it communicates state: hero swap with `layoutId`, incident entry, "down" pulse. `prefers-reduced-motion` is respected.
* Vite build with two entry points: `index.html` (console) and `wall.html` (wall, with no editing dependencies, loads in < 150 KB gzip).

## 3. Security (summary)

* **Orbit has no login**: no users, passwords, sessions, roles, 2FA or SSO. Access is controlled by the network.
* **Access policy** (`orbit.access.*`): read endpoints, the wall and acknowledgements are open to allowed clients; **mutations** (monitors, connections, secrets, layouts, themes, settings) are accepted only from **loopback by default**. `orbit.access.edit-from` accepts `loopback` (default), `lan` or a CIDR allowlist; `orbit.access.view-from` defaults to private ranges. Requests outside the policy get `403` with a Problem Details body.
* **No operator name**: Orbit does not ask who you are; acknowledgements, comments and the audit trail record the client kind (`loopback` = the machine running Orbit, `lan`).
* Bind address defaults to `127.0.0.1`; exposing Orbit to the LAN (for the TV) is an explicit setting. Never expose it to the internet.
* Secrets never come back from the API; the frontend only sees `•••• (vault)`.
* Orbit database user on each target: `GRANT SELECT` only on the required views/tables; for heavy queries, creating **one view per query** on the target database is recommended.
* Auditing: which client (loopback/LAN) created/changed each SELECT, with a diff.
* Wall screen: read-only, no customer personal data.

## 4. Local-first execution

Orbit is a **local application**: everything runs on the operator's own machine, and the only network traffic it originates is the checks themselves (HTTP requests, SELECTs, pings) towards the systems being monitored, local or online, plus the notifications the operator configured. There is no Orbit server in the cloud, no Orbit database and no account.

| Component | Implementation |
|---|---|
| Configuration | One JSON file per feature in `~/.orbit/config/` ([06-configuration-files.md](06-configuration-files.md)) |
| Secrets | Encrypted inside those files with `~/.orbit/master.key`, or `${env:NAME}` references |
| History (heartbeats, series, events, audit) | Last hour in memory; **30 days on disk** in compact, compressed, append-only segments under `~/.orbit/data/` ([08-logs-and-history.md](08-logs-and-history.md)) |
| Execution queue | In-memory `BlockingQueue` + `@Scheduled` |
| Real time | WebSocket in the same process (`ws://localhost:8080/ws/wall`) |
| Frontend | `vite dev` on `localhost:5173` with a proxy to `:8080`, or the jar serving the built `dist/` |
| Network | Binds to `127.0.0.1`; `orbit.server.lan=true` lets a TV on the internal network open the wall (view-only) |

Repository layout:

```
backend/            Maven multi-module build (parent pom.xml + mvnw)
  orbit-api/        application module (Spring Boot entry point, executable jar)
  config-examples/  orbit.<feature>.example.json files (no real secrets)
frontend/           React + Vite app (index.html = console, wall.html = wall)
docs/               these specifications
```

How to run:

```bash
# backend
cd backend && ./mvnw -pl orbit-api -am spring-boot:run

# frontend (another terminal)
cd frontend && npm install && npm run dev
# console: http://localhost:5173    wall: http://localhost:5173/wall.html
```

* First run creates `~/.orbit/config/` and `~/.orbit/master.key`; configuration files appear as the operator registers connections, requests, selects, layouts and so on.
* JDBC drivers for the target databases (`ojdbc11` for Oracle 11g, `postgresql`, `mssql-jdbc`, `mysql-connector-j`) ship in the jar; the only database access is the monitored SELECTs.
* A single executable jar (`cd backend && ./mvnw package` → `java -jar orbit-api/target/orbit-api.jar`) also serves the built frontend.
* OpenAPI generated by springdoc and consumed by the frontend at build time.
* Orbit monitors itself: `/actuator/health` is the first monitor.
* Tests: JUnit 5 on the backend (Testcontainers with real target databases only when Docker is available; H2 may be used **only in tests** as a stand-in target for the SQL probe); Vitest + Testing Library on the frontend; Playwright on the wall. TDD as a rule.
* Commits follow Conventional Commits.
