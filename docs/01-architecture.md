# Orbit Monitor — Architecture

Stack: **Java 21 + Spring Boot 3** on the backend, **React 19 + Vite + TypeScript + Tailwind CSS v4 + Motion** on the frontend, **PostgreSQL** as Orbit's own database, **Redis** for the execution queue and state cache. Monitored databases (Oracle 11g, Postgres, SQL Server, MySQL) are accessed read-only through dedicated connections.

```
┌──────────────┐   HTTPS/WSS   ┌──────────────────────────────────────────────┐
│  Wall / Web  │ ───────────▶  │ Gateway                                      │
│ (React/Vite) │ ◀───────────  │  TLS · rate limit · flag → domain/subdomain  │
└──────────────┘               └───────────────┬──────────────────────────────┘
                                               ▼
                               ┌──────────────────────────────┐
                               │ Security (main domain)       │
                               │ HttpClient · AppSecurity     │
                               │ AppRouter · Vault · Audit    │
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
                               │ (read-only user)             │
                               └──────────────────────────────┘
```

## 1. Domains (backend)

Each domain is its own Maven module (`orbit-<domain>`), with an internal API through interfaces and events; no calls between repositories of different domains. Every external request enters through the Gateway with a **flag** (`X-Orbit-Route: monitor.create`) that Security validates and the Router dispatches.

| Domain | Subdomains | Responsibility | Main tables |
|---|---|---|---|
| **Security** | auth, rbac, vault, audit | Login, 2FA (TOTP), sessions, per-group roles, credential vault (AES-256-GCM, key kept outside the database via env/KMS), audit trail of every mutation | `user`, `role`, `group_member`, `secret`, `audit_log` |
| **Workspace** | group, tag, layout | Groups, tags, ordering and **wall layout** (what appears, where and how) | `workspace`, `group`, `tag`, `wall_layout` |
| **Monitor** | http, sql, condition | Definition of each monitor and its health conditions; SELECT validation; column discovery | `monitor`, `monitor_http`, `monitor_sql`, `condition`, `connection` |
| **Probe** | scheduler, executor, sandbox | Schedules and runs checks with isolation, timeout and a per-target circuit breaker | `probe_run` (short retention) |
| **Telemetry** | heartbeat, series, rollup | Stores results, computes state with hysteresis, per-minute/hour/day series, uptime and p95 | `heartbeat`, `series_1m`, `series_1h`, `series_1d` |
| **Alerting** | rule, channel, incident, escalation | Opens/closes incidents, acknowledgement, time-based escalation, delivery via email/Teams/Slack/webhook | `incident`, `incident_event`, `channel`, `escalation_policy` |

### Flow of a check

1. `Probe.scheduler` (Quartz or `@Scheduled` with a Redis lock) enqueues `ProbeJob(monitorId)` at the monitor's interval.
2. A `ProbeExecutor` (Java 21 virtual-thread pool) picks up the job and calls `HttpProbe` or `SqlProbe`.
3. The executor returns `ProbeResult { status, latencyMs, payload, error }`.
4. `Telemetry` stores the heartbeat, evaluates the **conditions**, applies hysteresis and emits `MonitorStateChanged` if the state changed.
5. `Alerting` reacts to the event: opens an incident, fires channels, starts the escalation clock.
6. The Gateway publishes the new state over the **WebSocket** `/ws/wall`; the wall updates without polling.

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
* Anti-SSRF in `HttpProbe`: resolves DNS and blocks private ranges and cloud metadata endpoints, unless allowlisted per workspace.

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
    security/     login, 2FA, route guards
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

* Short-lived JWT + refresh in an `HttpOnly` cookie; 2FA mandatory for roles that edit monitors.
* Per-group RBAC: `viewer`, `operator` (acknowledges incidents), `editor` (creates monitors), `admin`.
* Secrets never come back from the API; the frontend only sees `•••• (vault)`.
* Orbit database user on each target: `GRANT SELECT` only on the required views/tables; for heavy queries, creating **one view per query** on the target database is recommended.
* Auditing: who created/changed each SELECT, with a diff.
* Wall screen: its own token, read-only, no customer personal data.

## 4. Local execution (no Docker, no deployment)

For now Orbit runs only on your machine. To make that possible the architecture above runs **without Redis and without Postgres**, replaced by embedded components, without changing the domain code (only the port implementations):

| Component | Future production | Local now |
|---|---|---|
| Orbit database | PostgreSQL | **File-based H2** (`~/.orbit/orbit.mv.db`) or SQLite via JDBC driver; same Flyway schema |
| Execution queue | Redis | In-memory `BlockingQueue` + `@Scheduled` with a local lock |
| State cache | Redis | In-memory Caffeine |
| Real time | WebSocket via Gateway | WebSocket embedded in the same process (`ws://localhost:8080/ws/wall`) |
| Frontend | Nginx serving the build | `vite dev` on `localhost:5173` with a proxy to `:8080`; or Spring serving `dist/` from `static/` |

Repository layout:

```
backend/          Maven multi-module build (parent pom.xml + mvnw)
  orbit-api/      application module (Spring Boot entry point, executable jar)
frontend/         React + Vite app (index.html = console, wall.html = wall)
docs/             these specifications
```

How to run:

```bash
# backend
cd backend && ./mvnw -pl orbit-api -am spring-boot:run -Dspring-boot.run.profiles=local

# frontend (another terminal)
cd frontend && npm install && npm run dev
# console: http://localhost:5173    wall: http://localhost:5173/wall.html
```

* `local` profile in `application-local.yml`: H2, vault secrets with a key generated on first run and stored in `~/.orbit/master.key`, 2FA disabled, admin user created on first access.
* JDBC drivers for the target databases (`ojdbc11` for Oracle 11g, `postgresql`, `mssql-jdbc`) already in the `pom.xml`; each target's connection is registered through the UI.
* A single executable jar (`cd backend && ./mvnw package` → `java -jar orbit-api/target/orbit-api.jar`) also serves the built frontend, so the TV only needs to point at `http://<your-machine>:8080/wall.html` on the internal network.
* Migrations with Flyway. OpenAPI generated by springdoc and consumed by the frontend at build time.
* Orbit monitors itself: `/actuator/health` is the first monitor.
* Tests: JUnit 5 with H2 on the backend (Testcontainers with Oracle XE only when Docker is available); Vitest + Testing Library on the frontend; Playwright on the wall. TDD as a rule.
* Commits follow Conventional Commits.

When it is time to deploy, just enable the `prod` profile (Postgres + Redis) and package; no domain changes.
