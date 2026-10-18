# Orbit Monitor — Extended Features

This document extends [02-features.md](02-features.md) with **50 frontend** and **50 backend** features. Every feature has an ID (`FE-xx`, `BE-xx`) that test names and commits reference, e.g. `FE-21: visualization picker`.

Test-first workflow: each feature gets its test suite **before** the implementation. Tests for features not implemented yet are committed as *pending* (see §3) so the main test run stays green.

## 1. Frontend (FE)

### Theming and personalization

| ID | Feature | Acceptance highlights |
|---|---|---|
| FE-01 | **Theme editor** | Create/edit a color theme (`bg`, `s1–s3`, `line`, `text/muted/dim`, `ok/warn/down/info`) with live preview of the wall and console |
| FE-02 | **Contrast guard** | Checks WCAG 4.5:1 (body) and 3:1 (large labels) for every text/surface pair; status colors must be distinguishable; suggests a fixed value |
| FE-03 | **Theme presets** | Orbit Dark (default), Light, High contrast, OLED black, Color-blind safe (deuteranopia, protanopia, tritanopia) |
| FE-04 | **Theme import/export** | JSON schema-validated; share a theme with the workspace |
| FE-05 | **Per-layout theme** | A wall layout can override the console theme |
| FE-06 | **Animation level** | `off`, `minimal`, `standard` (default), `expressive`; `prefers-reduced-motion` is a hard ceiling (forces `off`) |
| FE-07 | **Density** | `compact`, `comfortable`, `spacious` in the console |
| FE-08 | **Viewing distance scale** | Wall font presets for 2 m / 3 m / 5 m on top of the fluid base |
| FE-09 | **Night mode schedule** | Dim the wall between configurable hours |
| FE-10 | **Workspace branding** | Sanitized SVG logo and workspace name in the header |

### Drag and drop and layout

| ID | Feature | Acceptance highlights |
|---|---|---|
| FE-11 | **Wall layout editor** | 12-column grid, snapping, resize handles, collision resolution |
| FE-12 | **Keyboard drag and drop** | Space to grab, arrows to move/resize, Esc to cancel; screen reader announcements |
| FE-13 | **Reorder monitors and groups** | Drag inside the matrix and between groups |
| FE-14 | **Reorder fields and columns** | Drag fields in *Data & display* and table columns |
| FE-15 | **Undo/redo** | `Ctrl+Z` / `Ctrl+Shift+Z` in the layout editor, bounded history |
| FE-16 | **Layout templates** | NOC, Executive, Team, Single incident |
| FE-17 | **Incident simulator** | "What if" mode shows how the wall reacts to a fake incident |
| FE-18 | **Screen previews** | 1080p, 4K, ultrawide and portrait frames |
| FE-19 | **Layout playlist** | Rotate layouts with per-layout duration; pauses while an incident is unacknowledged |
| FE-20 | **Video wall tiling** | `?tile=2/4` renders one tile of a 2×1 or 2×2 split |

### Visualizations

| ID | Feature | Acceptance highlights |
|---|---|---|
| FE-21 | **Visualization picker** | Shows the field's real data rendered in every compatible mode side by side; the user clicks the one they like |
| FE-22 | **Compatibility rules** | Only modes compatible with the data shape are enabled; the best one is suggested |
| FE-23 | **Visualization settings** | Color bands, decimals, prefix/suffix, min/max, threshold line, what to show when a rule fails |
| FE-24 | **20 display modes** | See §1.1 |
| FE-25 | **Week-over-week overlay** | Same period last week drawn as a ghost line |
| FE-26 | **Chart annotations** | Incidents, maintenance windows and deploy markers on time charts |
| FE-27 | **Zoom and synced crosshair** | Brush to zoom; crosshair synced across charts of the same page |

#### 1.1 The 20 display modes

| # | Mode | Best for |
|---|---|---|
| 1 | Big number + trend arrow + sparkline | Single numeric value |
| 2 | Radial gauge | Value with min/max |
| 3 | Bullet chart | Value vs target and bands |
| 4 | Headroom bar | Distance to the threshold ("Near threshold") |
| 5 | KPI card | Several numbers in one row |
| 6 | Line chart | Stored series |
| 7 | Area chart | Volume over time |
| 8 | Step line | State or discrete values over time |
| 9 | Bar / ranking | Category + number |
| 10 | Stacked bar | Category + several numbers |
| 11 | Donut | Share of a whole (≤ 6 slices) |
| 12 | Hour × weekday heatmap | Seasonality |
| 13 | Calendar heatmap | Daily uptime / daily totals |
| 14 | Uptime ribbon | Up/down history as colored segments |
| 15 | Traffic light | Only needs "is it OK" |
| 16 | Status pill | Text field mapped to colors (`"UP"` → green) |
| 17 | Live table | Several rows, rule-violating rows highlighted |
| 18 | Small multiples | One sparkline per category |
| 19 | Histogram | Latency distribution |
| 20 | Hex grid | Many monitors at a glance |

Every mode: state always has a text label, values use tabular mono, all sensitive values go through `<SafeValue>` ([04-data-protection.md](04-data-protection.md)), and the mode respects the animation level.

### Console productivity

| ID | Feature | Acceptance highlights |
|---|---|---|
| FE-28 | **Command palette** | `Ctrl+K` searches monitors, groups, layouts and actions |
| FE-29 | **Keyboard shortcuts** | Global shortcuts with a `?` cheat sheet |
| FE-30 | **Saved views** | Saved filters by group, tag and state in the monitor list |
| FE-31 | **Bulk actions** | Multi-select to pause, tag, move or delete with confirmation |
| FE-32 | **Monitor templates and clone** | "Spring Actuator health", "Oracle blocking locks", etc.; clone wizard |
| FE-33 | **SQL editor** | Highlighting, catalog autocomplete, format, visible guard chips |
| FE-34 | **Condition builder** | Visual and text modes kept in sync; "would fail now" against the preview |
| FE-35 | **JSON explorer** | Click a node to create a JSONPath field |
| FE-36 | **Query history diff** | Side-by-side diff of SELECT changes from the audit trail |
| FE-37 | **Onboarding** | Guided first monitor and helpful empty states |
| FE-38 | **Notification center** | In-app incident feed and toasts |
| FE-39 | **Incident page** | Timeline, comments, acknowledge, ticket link, postmortem |
| FE-40 | **Escalation countdown** | "Escalates in 08:12" widget on the wall and console |
| FE-41 | **Maintenance calendar** | Drag on a calendar to create a maintenance window |
| FE-42 | **Dependency graph** | Interactive graph with impact radius highlight |
| FE-43 | **SLA reports** | Uptime per group/monitor, CSV/PDF export |
| FE-44 | **Status page builder** | Pick groups, preview the public/internal page |

### Wall runtime and preferences

| ID | Feature | Acceptance highlights |
|---|---|---|
| FE-45 | **Kiosk mode** | Fullscreen, hidden cursor, Screen Wake Lock, auto-reconnect |
| FE-46 | **Stale data indicator** | Data age badge; wall greys out after N seconds without updates |
| FE-47 | **Sound alerts** | Per-severity sounds and volume, muted by default |
| FE-48 | **Desktop notifications** | Opt-in browser notifications for new incidents |
| FE-49 | **Mobile on-call view** | Hero, active incidents and a full-width Acknowledge button |
| FE-50 | **Preference sync** | Theme, animation level, density, language and scale saved per user on the server |

## 2. Backend (BE)

### Probes

| ID | Feature | Acceptance highlights |
|---|---|---|
| BE-01 | **TCP probe** | Connect time, timeout, refused vs timeout distinction |
| BE-02 | **Ping probe** | ICMP with TCP fallback when ICMP is not permitted |
| BE-03 | **Push monitor** | Generated URL with secret token; "no signal for X min" = down |
| BE-04 | **DNS probe** | Record type, expected value, resolution time |
| BE-05 | **Certificate and domain expiry** | Days left, chain and issuer; domain expiry via RDAP; 30/14/7-day warnings |
| BE-06 | **HTTP keyword/regex match** | Body contains / does not contain / regex |
| BE-07 | **Multi-step HTTP** | Ordered steps with extracted variables (login → call API) |
| BE-08 | **OAuth2 client credentials** | Token cached and refreshed before expiry |
| BE-09 | **gRPC health probe** | Standard `grpc.health.v1` check |
| BE-10 | **Kafka consumer lag probe** | Lag per group/topic as a series |
| BE-11 | **SQL parameters** | `:param` bound from fixed values or workspace variables, never string-concatenated |
| BE-12 | **Query catalog** | Saved, reusable SELECTs with owner and description |
| BE-13 | **Catalog introspection** | Tables/columns for autocomplete, cached per connection |
| BE-14 | **Query cost warning** | Preview time and `EXPLAIN` when supported; suggests a longer interval |
| BE-15 | **Per-target isolation** | Dedicated HikariCP pool (max 2–3) and one query at a time per connection |
| BE-16 | **Circuit breaker** | 3 consecutive failures pause the target for 1 min ("no response") |
| BE-17 | **Execution windows** | Business hours/weekdays, timezone-aware |
| BE-18 | **Retries with backoff** | N attempts before marking down |

### Telemetry

| ID | Feature | Acceptance highlights |
|---|---|---|
| BE-19 | **Rollups and retention** | 1m/1h/1d rollups; purge job per retention policy |
| BE-20 | **Uptime and SLA** | Excludes maintenance windows; 24h/7d/30d/closed month |
| BE-21 | **Percentiles** | p50/p95/p99 per window |
| BE-22 | **Anomaly detection** | Deviation vs same-hour baseline of the last week; z-score |
| BE-23 | **Body metric extraction** | JSONPath values stored as series |
| BE-24 | **Time to threshold** | Linear regression forecasts when a series crosses its threshold |
| BE-25 | **Flapping detection** | N state changes in M minutes → `FLAPPING`, one incident |

### Alerting

| ID | Feature | Acceptance highlights |
|---|---|---|
| BE-26 | **Incident lifecycle** | Open, acknowledge, resolve, reopen; event log with actor and time |
| BE-27 | **Escalation policies** | Timed steps, stop on acknowledge |
| BE-28 | **Channels** | SMTP, Teams, Slack, Telegram, HMAC-signed webhook, WhatsApp provider |
| BE-29 | **Deduplication** | Equal alerts grouped in a 5-min window |
| BE-30 | **Cascade suppression** | Dependency graph collapses downstream alerts into one incident |
| BE-31 | **Maintenance windows** | One-off and recurring (cron), silence and exclude from uptime |
| BE-32 | **Silence/snooze** | With reason, actor and expiry |
| BE-33 | **On-call schedules** | Rotations; "who is on call now" for escalation and the wall clock block |
| BE-34 | **Postmortem report** | Timeline, MTTA, MTTR, who acknowledged |
| BE-35 | **Notification templates** | Variables and i18n (en/pt-BR); values redacted |
| BE-36 | **Channel reliability** | Rate limit per channel, retry with backoff, dead-letter queue |

### Workspace and configuration

| ID | Feature | Acceptance highlights |
|---|---|---|
| BE-37 | **Monitoring as code** | YAML import/export with dry-run diff |
| BE-38 | **Realtime protocol** | WebSocket snapshot + deltas with sequence numbers; resume after reconnect |
| BE-39 | **Workspace variables** | `${var:name}` and `${vault:name}` references |
| BE-40 | **User preferences and themes API** | Theme, animation level, density, locale, scale; server-side contrast validation |
| BE-41 | **Wall layouts and tokens** | Versioned layouts; revocable, scoped, expiring wall tokens |
| BE-42 | **Status page API** | Public/internal read-only, cached, no personal data |
| BE-43 | **Uptime Kuma import** | Maps monitors and groups |

### Security and platform

| ID | Feature | Acceptance highlights |
|---|---|---|
| BE-44 | **TOTP 2FA** | Enrollment, verification, recovery codes |
| BE-45 | **API keys** | Personal access tokens with scopes and expiry, stored hashed |
| BE-46 | **Audit query API** | Filters, SELECT change diff, never stores probe results |
| BE-47 | **Rate limiting and lockout** | Per user/IP; brute-force lockout on login |
| BE-48 | **Secret rotation** | Rotate connection credentials without recreating monitors |
| BE-49 | **Problem Details errors** | RFC 9457 responses with stable codes and i18n messages; OpenAPI |
| BE-50 | **Self-monitoring and backup** | Micrometer/Prometheus metrics, Orbit monitors itself; encrypted workspace backup/restore |

## 3. Pending tests convention

Tests for features not implemented yet exist from day one, with real assertions, but are excluded from the default run:

| | Backend | Frontend |
|---|---|---|
| Mark | `@Tag("pending")` on the class or method | file name `*.pending.test.ts(x)` |
| Default run | `./mvnw test` excludes `pending` | `npm test` excludes `*.pending.test.*` |
| Run pending | `./mvnw test -Ppending` | `npm run test:pending` |
| When implementing | remove the tag, watch it fail, implement, watch it pass | rename to `*.test.ts(x)`, same cycle |

A feature is done only when none of its tests are pending.
