# Orbit Monitor — Extended Features

This document extends [02-features.md](02-features.md) with **50 frontend** and **50 backend** features. Every feature has an ID (`FE-xx`, `BE-xx`) that test names and commits reference, e.g. `FE-21: visualization picker`.

Test-first workflow: each feature gets its test suite **before** the implementation. Tests for features not implemented yet are committed as *pending* (see §3) so the main test run stays green.

## 1. Frontend (FE)

### Theming and personalization

| ID | Feature | Acceptance highlights |
|---|---|---|
| FE-01 | **Theme editor** | Create/edit a color theme (`bg`, `s1–s3`, `line`, `text/muted/dim`, `ok/warn/down/info`) with live preview of the wall and console |
| FE-02 | **Contrast guard** | Checks WCAG 4.5:1 (body) and 3:1 (large labels) for every text/surface pair; status colors must be distinguishable; suggests a fixed value |
| FE-03 | **Theme gallery** | Keep the default Orbit Dark or switch to 30 built-in themes inspired by popular editor themes (Dracula, Nord, Tokyo Night, Catppuccin…) plus 6 accessibility themes (see §1.3) |
| FE-04 | **Theme import/export** | Orbit theme JSON (schema-validated), **import a VS Code color theme `.json`** with automatic mapping, share a theme with the workspace |
| FE-05 | **Per-layout theme** | A wall layout can override the console theme |
| FE-06 | **Animation settings** | Configure how much motion Orbit has: preset level, intensity, speed and per-category switches, per device and per wall layout, with live preview (see §1.2) |
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

#### 1.3 Themes (FE-01 – FE-05)

The user can **keep the default theme (Orbit Dark)** or pick any of **30 built-in themes** inspired by popular editor color schemes, plus **6 accessibility themes**. Every theme recolors the whole product: wall, console, charts, SQL editor syntax, status colors and the FX layer (FE-52).

| # | Theme | Mode | Inspired by |
|---|---|---|---|
| 1 | Dracula | dark | Dracula |
| 2 | One Dark | dark | Atom One Dark |
| 3 | Nord | dark | Nord |
| 4 | Tokyo Night | dark | Tokyo Night |
| 5 | Tokyo Night Storm | dark | Tokyo Night |
| 6 | Catppuccin Mocha | dark | Catppuccin |
| 7 | Catppuccin Macchiato | dark | Catppuccin |
| 8 | Catppuccin Frappé | dark | Catppuccin |
| 9 | Rosé Pine | dark | Rosé Pine |
| 10 | Rosé Pine Moon | dark | Rosé Pine |
| 11 | Gruvbox Dark | dark | Gruvbox |
| 12 | Solarized Dark | dark | Solarized |
| 13 | Monokai Classic | dark | Monokai (TextMate) |
| 14 | GitHub Dark | dark | GitHub themes |
| 15 | GitHub Dark Dimmed | dark | GitHub themes |
| 16 | Ayu Dark | dark | Ayu |
| 17 | Ayu Mirage | dark | Ayu |
| 18 | Night Owl | dark | Night Owl |
| 19 | Palenight | dark | Material Palenight |
| 20 | Everforest Dark | dark | Everforest |
| 21 | Kanagawa | dark | Kanagawa |
| 22 | Synthwave '84 | dark | SynthWave '84 |
| 23 | Cobalt2 | dark | Cobalt2 |
| 24 | Shades of Purple | dark | Shades of Purple |
| 25 | Poimandres | dark | Poimandres |
| 26 | GitHub Light | light | GitHub themes |
| 27 | Solarized Light | light | Solarized |
| 28 | Catppuccin Latte | light | Catppuccin |
| 29 | Rosé Pine Dawn | light | Rosé Pine |
| 30 | Gruvbox Light | light | Gruvbox |

Accessibility themes: **High Contrast Dark**, **High Contrast Light**, **OLED Black**, **Color-blind safe — deuteranopia / protanopia / tritanopia**.

**Theme tokens** (one JSON per theme in `frontend/src/shared/theme/themes/<id>.json`, same schema as custom themes in `orbit.themes.json`):
`bg`, `s1`, `s2`, `s3`, `line`, `line2`, `text`, `muted`, `dim`, `ok`, `warn`, `down`, `info`, `accent`, `chart[6]` (series palette), `syntax{keyword,string,number,comment,function,operator,identifier}`, `fx{from,to,glow}`, plus metadata `id`, `name`, `mode` (`dark`/`light`), `inspiredBy`, `author`, `license`, `url`.

**Status colors stay meaningful**: each theme maps OK/WARN/DOWN/INFO to its own green/yellow/red/blue; the contrast guard (FE-02) verifies text contrast (4.5:1 body, 3:1 large) and that the four status colors are distinguishable (including simulated color-vision deficiencies). If a palette fails, the theme ships with adjusted status shades, recorded in its metadata. A unit test validates all built-in themes.

**Gallery** (Settings → Appearance):
- Card grid with a live mini-wall preview per theme (hero + matrix + chart), filters *Dark / Light / Accessible*, search, favorites, "Restore default".
- Hover previews the theme on the real screen; click applies; changes animate with a 280 ms color cross-fade (respects FE-06).
- **Duplicate & edit** any theme in the editor (FE-01) to create a custom one.
- **Import VS Code theme**: drop a VS Code `*.json` color theme; Orbit maps `editor.background`, `sideBar.background`, `panel.border`, `editor.foreground`, `terminal.ansiGreen/Yellow/Red/Blue`, `tokenColors` scopes, etc. to Orbit tokens, runs the contrast guard and shows the fixes before saving.
- **Scope**: per device by default (FE-50), workspace default (`orbit.settings.json`), per wall layout override (FE-05, `orbit.layouts.json`), URL override `wall.html?theme=<id>`; `prefers-color-scheme` can auto-pick a light/dark pair.

**Credits and licensing**: built-in themes reproduce color palettes and carry attribution (`inspiredBy`, author, license, link) in their JSON and in `docs/themes.md`; only palettes under permissive licenses are bundled, and names are used descriptively ("inspired by"). No theme assets, logos or icons are copied.

#### 1.2 Animation settings (FE-06)

A dedicated panel in **Settings → Animation** (and a compact switch in the console header) controls every kind of motion in Orbit.

| Control | Values | Default | Effect |
|---|---|---|---|
| **Level (preset)** | `off`, `minimal`, `standard`, `expressive` | `standard` | Sets all controls below at once; editing any control turns the preset into `custom` |
| **Intensity** | 0–100 % | 60 % (`standard`) | Scales distance, scale change, glow strength, particle density and 3D movement |
| **Speed** | 0.5× – 1.5× | 1× | Multiplies every duration token (FE-51) |
| **Component transitions** | on / off | on | Enter, exit, expand, dialogs, toasts, reorder (FE-51) |
| **Status and value feedback** | on / off | on | Status cross-fade, dot pulse, value flash, threshold fade (FE-51) |
| **Attention signals** | on / off | on | DOWN-without-owner blink and hero glow; can be turned off for photosensitive viewers |
| **3D and visual effects** | off / low / high | low | 3D orb, glass tilt, sheen (FE-52) |
| **Animated background** | on / off | on | Orbital lines / particles (FE-52) |
| **Intros and guides** | on / off | off | Remotion compositions in onboarding and empty states (FE-52) |
| **Hover and drag effects** | on / off | on | Hover tilt, press scale, drag lift |

Presets map to these controls:

| Preset | Intensity | Speed | Transitions | Feedback | Attention | 3D / FX | Background | Intros | Hover/drag |
|---|---|---|---|---|---|---|---|---|---|
| `off` | 0 % | – | off | off (instant state change) | off | off | off | off | off |
| `minimal` | 25 % | 1× | opacity only | color only | on (no blink, static red) | off | off | off | off |
| `standard` | 60 % | 1× | on | on | on | low | on | off | on |
| `expressive` | 100 % | 1.25× slower | on | on | on | high | on | on | on |

**Behavior**
- **Live preview**: the panel shows a sample card, a status pill switching OK → WARN → DOWN, a value change and a mini 3D orb, re-rendered with the current settings; a "Simulate incident" button shows the attention signals.
- **Scope**: saved **per device** (FE-50) by default; the workspace can set **defaults** (`orbit.settings.json`, BE-40); each **wall layout** can override them (`orbit.layouts.json`, BE-41) — e.g. TV `minimal`, console `expressive`. URL override for TVs: `wall.html?motion=off|minimal|standard|expressive`.
- **Precedence** (highest first): `prefers-reduced-motion` (forces `off`, the panel explains why and how to change it in the OS) → URL `?motion=` → wall layout override → device setting → workspace default.
- **Automatic downgrade**: if frame time stays above 20 ms for 3 s, 3D/FX and background step down one notch and a quiet notice offers "Keep simplified" or "Try again".
- **Accessibility**: every control is keyboard-operable with a visible label in en / pt-BR; a one-click "Reduce motion" action sets `minimal`; settings never hide state information (labels and colors always remain).
- Implemented as a single source of truth (`useMotionSettings()`), consumed by the FE-51 presets and the FE-52 FX layer; no component reads `prefers-reduced-motion` on its own.

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
| FE-50 | **Device preferences** | Theme, animation level, density, language, scale and operator name saved on the device, with workspace defaults from the server and JSON export/import |

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
| BE-19 | **Rollups** | 1-minute and 1-hour rollups written to the 30-day history log (CORE-22) |
| BE-20 | **Uptime and SLA** | Excludes maintenance windows; 24 h / 7 d / 30 d from the history log, states its coverage |
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
| BE-37 | **Config export/import** | Archive of all `orbit.<feature>.json` files (secrets omitted) with dry-run diff |
| BE-38 | **Realtime protocol** | WebSocket snapshot + deltas with sequence numbers; resume after reconnect |
| BE-39 | **Workspace variables** | `${var:name}` and `${vault:name}` references |
| BE-40 | **Workspace defaults and themes API** | Default theme, animation level, density, locale and scale; custom themes with server-side contrast validation |
| BE-41 | **Wall layouts** | Versioned layouts addressed by slug (`/wall/noc`), read-only for view clients |
| BE-42 | **Status page API** | Public/internal read-only, cached, no personal data |
| BE-43 | **Uptime Kuma import** | Maps monitors and groups |

### Security and platform

| ID | Feature | Acceptance highlights |
|---|---|---|
| BE-44 | **Network access policy** | No login; mutations only from loopback by default, `lan` or CIDR allowlist configurable, view-only otherwise; `403` Problem Details |
| BE-45 | **Operator identity** | Self-declared `X-Orbit-Operator` name recorded on acknowledgements, comments and audit; anonymization endpoint |
| BE-46 | **Audit query API** | Filters, SELECT change diff, never stores probe results |
| BE-47 | **Rate limiting** | Per client IP on API and Push endpoints |
| BE-48 | **Secret rotation** | Rotate connection credentials without recreating monitors |
| BE-49 | **Problem Details errors** | RFC 9457 responses with stable codes and i18n messages; OpenAPI |
| BE-50 | **Self-monitoring and config backup** | Micrometer metrics, Orbit monitors itself; `.bak` rotation and encrypted backup of the config directory |

## 3. Pending tests convention

Tests for features not implemented yet exist from day one, with real assertions, but are excluded from the default run:

| | Backend | Frontend |
|---|---|---|
| Mark | `@Tag("pending")` on the class or method | file name `*.pending.test.ts(x)` |
| Default run | `./mvnw test` excludes `pending` | `npm test` excludes `*.pending.test.*` |
| Run pending | `./mvnw test -Ppending` | `npm run test:pending` |
| When implementing | remove the tag, watch it fail, implement, watch it pass | rename to `*.test.ts(x)`, same cycle |

A feature is done only when none of its tests are pending.
