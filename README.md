# Orbit Monitor

Monitoring for websites, APIs and databases, with a **TV wall** that changes shape according to severity. Operators write what they want to watch (a URL or a `SELECT`) and Orbit figures out the rest: columns, types, display mode and alerts.

> Status: under active development (MVP).

Orbit is **local-first**: it runs entirely on your machine, with no account, no login and no database of its own. Everything you configure is saved in local JSON files (one per feature, never committed), and the only traffic Orbit sends out is the checks you define.

## Highlights

- **SQL monitor**: paste a `SELECT` (Oracle, Postgres, SQL Server, MySQL), preview the result with detected column types and turn columns into metrics, charts and alerts. Read-only, validated, with timeout and row limit.
- **HTTP monitor**: status, response time, JSONPath on the body, certificate expiry, cloud-metadata guard.
- **Gatus-style conditions**: `[STATUS] == 200`, `[COL].PENDING_QTY < 50`, with warning/down levels and hysteresis.
- **Wall (TV mode)**: hero panel with the worst incident, "near threshold", monitor matrix, timeline and acknowledgement.
- **Incidents and alerts**: acknowledgement, escalation and channels (e-mail, Teams, Slack, webhook).
- **Privacy by design (LGPD & PCI DSS)**: card numbers, CVV, CPF, e-mails and secrets are detected and masked at the probe boundary; a full card number is never displayed, logged or stored.
- **Internationalization**: English by default, with Brazilian Portuguese (pt-BR) available in the UI and in user-facing messages.

## Repository layout

| Path | Contents |
|---|---|
| [`backend/`](backend/) | Java 21 + Spring Boot 3, Maven multi-module (one module per domain) |
| [`frontend/`](frontend/) | React 19 + Vite + TypeScript + Tailwind CSS v4 + Motion |
| [`docs/01-architecture.md`](docs/01-architecture.md) | Architecture and domains |
| [`docs/02-features.md`](docs/02-features.md) | Features |
| [`docs/03-design.md`](docs/03-design.md) | Design principles and tokens |
| [`docs/04-data-protection.md`](docs/04-data-protection.md) | LGPD and PCI DSS controls |
| [`docs/05-extended-features.md`](docs/05-extended-features.md) | 100 extended features (FE/BE) and pending-test convention |
| [`docs/06-configuration-files.md`](docs/06-configuration-files.md) | Per-feature JSON configuration files (never committed) |

## Running locally

Requirements: Java 21 and Node.js 20+.

```bash
# backend (creates ~/.orbit/config on first run)
cd backend && ./mvnw -pl orbit-api -am spring-boot:run

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

After cloning, enable the hook that keeps configuration files and secrets out of Git:

```bash
git config core.hooksPath .githooks
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Matheus Chiodi
