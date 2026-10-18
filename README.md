# Orbit Monitor

Monitoring for websites, APIs and databases, with a **TV wall** that changes shape according to severity. Operators write what they want to watch (a URL or a `SELECT`) and Orbit figures out the rest: columns, types, display mode and alerts.

> Status: under active development (MVP).

## Highlights

- **SQL monitor**: paste a `SELECT` (Oracle, Postgres, SQL Server, MySQL), preview the result with detected column types and turn columns into metrics, charts and alerts. Read-only, validated, with timeout and row limit.
- **HTTP monitor**: status, response time, JSONPath on the body, certificate expiry, SSRF protection.
- **Gatus-style conditions**: `[STATUS] == 200`, `[COL].PENDING_QTY < 50`, with warning/down levels and hysteresis.
- **Wall (TV mode)**: hero panel with the worst incident, "near threshold", monitor matrix, timeline and acknowledgement.
- **Incidents and alerts**: acknowledgement, escalation and channels (e-mail, Teams, Slack, webhook).
- **Internationalization**: English by default, with Brazilian Portuguese (pt-BR) available in the UI and in user-facing messages.

## Repository layout

| Path | Contents |
|---|---|
| [`backend/`](backend/) | Java 21 + Spring Boot 3, Maven multi-module (one module per domain) |
| [`frontend/`](frontend/) | React 19 + Vite + TypeScript + Tailwind CSS v4 + Motion |
| [`docs/01-architecture.md`](docs/01-architecture.md) | Architecture and domains |
| [`docs/02-features.md`](docs/02-features.md) | Features |
| [`docs/03-design.md`](docs/03-design.md) | Design principles and tokens |

## Running locally

Requirements: Java 21 and Node.js 20+.

```bash
# backend (local profile: file-based H2, no Docker)
cd backend && ./mvnw spring-boot:run -pl orbit-api -Dspring-boot.run.profiles=local

# frontend (another terminal)
cd frontend && npm install && npm run dev
# console: http://localhost:5173    wall: http://localhost:5173/wall.html
```

Tests:

```bash
cd backend && ./mvnw test
cd frontend && npm test
```

See each folder's README for details.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Matheus Chiodi
