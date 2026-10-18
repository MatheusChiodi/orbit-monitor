# Orbit Monitor — Features

Principle: **the operator writes what they want to observe and Orbit figures out the rest.** Paste a SELECT and the system recognizes the columns; paste a URL and the system makes the request and shows the response; from there the operator **chooses which data to keep and how each piece is displayed** (number, gauge, chart, table, traffic light), and what becomes an alert.

## 1. Workspace and groups

* **Workspace** per company/environment (`Production`, `Staging`), each with its own wall, users and channels.
* **Group** = a system or a team (`Payments`, `Customer Portal`, `Core Banking`). It gathers monitors of any type.
* Fields: name, color, icon, description, owner (person or team), tags, default escalation policy.
* **Dependencies between groups and monitors** (`Authentication API` → `Web portal`, `Checkout`). Used to show the blast radius and to **suppress cascading alerts**: if the service bus is down, the 12 monitors that depend on it become a single incident.
* Group state = worst state of its monitors. Scheduled **maintenance** windows silence the group and do not count toward uptime.
* Import/export a group as YAML (monitoring as code, to version in Git).

## 2. Monitors

Types in the first version: **HTTP**, **SQL**, **Ping/TCP** and **Push** (the system tells Orbit it is alive; useful for batch jobs). All of them share:

* Name, group, tags, interval (15 s to 24 h), timeout, retries before marking down, hysteresis.
* **Health conditions** with two levels: *warning* (WARN) and *down* (DOWN).
* Optional execution window ("business hours only", "weekdays only").
* History, 24 h/7 d/30 d uptime, p50/p95, incident list.
* Pause, duplicate, test now.

### 2.1 HTTP monitor (sites and APIs)

* Method, URL, headers, body (JSON/form), authentication (Basic, Bearer, API key, OAuth2 client credentials with automatic renewal). Secrets go to the vault.
* Follow redirects, ignore invalid TLS (with a warning), proxy per workspace.
* **Test now** shows status, time, headers and formatted body.
* Conditions on `[STATUS]`, `[RESPONSE_TIME]`, `[BODY]` (JSONPath or text contains), `[HEADER].x`, `[CERT_DAYS_LEFT]`.
* **Metric extraction from the body**: `$.queue.size` becomes a numeric series with its own chart and rule, with no need for another monitor.
* Built-in certificate and domain checks (warning 30/14/7 days before expiry).

### 2.2 SQL monitor (database queries)

This is the differentiator. The user flow:

1. Choose the **connection** (registered by an admin: Oracle, Postgres, SQL Server, MySQL; read-only user; credential in the vault; connection test at registration).
2. Paste the SELECT into the editor (with syntax highlighting and table/column autocomplete read from the database catalog).
3. Click **Run preview**. Orbit validates it (SELECT only), runs it with a timeout and row limit and shows the result as a table **with the detected type** of each column.
4. Choose the result's **reading mode**, suggested automatically:

| Result | Automatic suggestion | What it becomes |
|---|---|---|
| 1 row, 1 numeric column | **Single value** | A big number with a trend chart |
| 1 row, N columns | **Indicator card** | N labeled numbers (e.g.: `PENDING`, `ERROR`, `OK`) |
| N rows, category column + number | **Ranking / bars** | Bars per category (e.g.: errors per acquirer) |
| N rows with a date column | **Time series** | A line over time built from the result itself |
| N rows, any shape | **Table** | Live table (e.g.: stuck transactions, with ID and minutes) |
| 0 or N rows | **Row count** | `[ROWS]` as a metric (e.g.: blocking locks = 0) |

5. Define the **conditions** per column, with operators `<, <=, >, >=, ==, !=, between, in`, and for dates `older than 10min`. There can be several; each one with a level (warning/down).
6. Optional: **parameters** in the SELECT (`:days`, `:store`) with fixed values or values from workspace variables, and **enrichment** (label a column, format as currency/percentage/duration, hide a column on the wall).

Additional SQL features:

* **Comparison with history**: condition "value 50% above last week's average at the same time of day" (simple anomaly detection, no ML).
* **Heavy queries** get a cost warning (preview time) and a suggestion of a longer interval or a materialized view.
* **Query catalog** per connection: saved SELECTs reusable across monitors, with owner and description.
* **Safe mode**: function blocklist (`DBMS_*`, `UTL_*`, `pg_sleep`, `xp_cmdshell`), row limit, timeout, one query at a time per connection.
* Auditing with a diff of every SELECT change.

### 2.3 Choosing the data and how to display it (applies to HTTP and SQL)

Every monitor, after the preview, opens the **Data & display** step. Orbit lists everything that came back in the response and you check what you want to keep and how you want to see it.

**Step 1: choose the data.**
The result is presented as a list of fields:

* SQL: each column of the SELECT, with its detected type (`PENDING_QTY · number`, `LAST_BATCH_AT · date`, `STATUS · text`), plus the system fields `[ROWS]` and `[EXEC_TIME]`.
* HTTP: the response JSON tree (`$.status`, `$.queue.size`, `$.items[*].value`), plus `[STATUS]`, `[RESPONSE_TIME]`, `[CERT_DAYS_LEFT]` and headers.

For each checked field you define: **label** (how it appears on screen: "Pending" instead of `PENDING_QTY`), **format** (integer, decimal, currency, percentage, duration, relative date "12 min ago", text), **unit** and whether it is **stored as a series** (becomes history and a chart) or only displayed in the moment. Unchecked fields are not stored, which keeps Orbit's database small and avoids storing sensitive data by accident.

**Step 2: choose the display.**
Each field (or the whole monitor) gets a **display mode**, with an automatic suggestion based on the result's shape and free switching:

| Mode | When it makes sense | What it shows |
|---|---|---|
| **Number** | a numeric value | big number, unit, trend arrow and sparkline |
| **Gauge** | value with a clear threshold | headroom bar up to the rule (like "Near threshold") |
| **Indicators** | several columns in one row | card with N labeled numbers |
| **Line chart** | field stored as a series | last 60 min / 24 h with a threshold line |
| **Bars / ranking** | category + number | sorted bars (e.g.: errors per acquirer) |
| **Table** | several rows | chosen columns, sorting, row limit, highlighting of rows that violate a rule |
| **Text / state** | text field | colored pill by mapping (`"UP"` → green, `"DEGRADED"` → amber) |
| **Traffic light** | you only need to know whether it is ok | green/amber/red dot with the label |
| **Hidden** | used only in a condition | does not appear on the wall, but feeds the rules |

Per display you can also define **color bands** by value (`< 50` green, `50–200` amber, `> 200` red), decimal places, prefix/suffix, and **what appears when the rule fails** (e.g.: the number turns red and shows "+75% over limit").

**Step 3: where it appears.** The same field can appear in more than one place with different modes: in the matrix as a traffic light, in a wall block as a chart, in the group card as a number. The choice lives in the monitor; the position lives in the wall layout (section 3).

Full example: a SELECT that returns `ACQUIRER, ERROR_QTY, ERROR_PCT, LAST_ERROR`. You check all four, label `ERROR_PCT` as "Error rate" in percentage with one decimal place, store `ERROR_QTY` as a series, display the set as a **ranking by acquirer** on the wall and as a **number** (sum of `ERROR_QTY`) in the matrix, and create the rule `ERROR_PCT > 2` = warning, `> 5` = down.

### 2.4 Ping/TCP and Push

* ICMP ping and TCP port for servers, databases and queues.
* Push: Orbit generates a URL; the job calls it when it finishes. Rule "no signal for more than X minutes = down". Solves monitoring of batch routines and nightly integrations.

## 3. Configurable wall (TV mode)

The user builds **what appears, where and how**, with no code:

* **Layouts** saved per workspace: `NOC`, `Executive`, `Payments Team`. Each TV opens a layout by URL (`/wall/noc?token=…`).
* **Available blocks**: Status (automatic hero), Also active, Near threshold, Monitor matrix, Timeline, Single value, Indicator card, Series chart, Live table, Ranking, Group uptime, Clock/on-call shift, Free text.
* Drag-and-drop grid editor (12 columns), with 1080p and 4K preview.
* Per block: data source (monitor/group and **which field**), display mode (inherits the one defined in the monitor or overrides it only in this layout), period, title, size.
* **Automatic behavior** that can be enabled per layout: "when there is an incident, the hero takes 50% of the screen and lower-priority blocks hide"; "when everything is green, show the business indicators". This is what sets the wall apart from a regular dashboard.
* Night mode (lower brightness) by schedule; optional alert sound; rotation between layouts every N seconds.
* Read-only, revocable wall token that exposes nothing beyond what the layout shows. When running locally, the TV points at `http://<your-machine>:8080/wall.html` on the internal network.

## 4. Incidents and alerts

* An incident opens when a monitor goes *down* (or *warning*, if configured) and closes by itself on recovery, with duration and cause recorded.
* **Acknowledge** (with name and time), comment, link to an external ticket (ticket number).
* **Escalation**: policy per group, e.g.: 0 min → team channel; 15 min without acknowledgement → manager; 30 min → executives. Visible as a countdown on the wall.
* Channels: email, Microsoft Teams, Slack, Telegram, generic webhook, WhatsApp via provider. The message already carries the value that violated the rule and the incident link.
* **Smart suppression**: cascade by dependencies, maintenance window, grouping of identical alerts within 5 min, mute for X hours with a reason.
* Post-incident report generated automatically (timeline, who acknowledged, time to acknowledge and to resolve).

## 5. Reports and analysis

* Uptime per group and per monitor (24 h, 7 d, 30 d, closed month), exportable to PDF/CSV for SLA.
* Mean time to acknowledge and to resolve per team.
* Week-over-week comparison of SQL series (e.g.: reconciliation queue).
* Optional **public/internal status page**, generated from chosen groups.

## 6. Administration

* Users and roles per group (viewer, operator, editor, admin). 2FA mandatory for editor and admin (disabled in the local profile). SSO (Google/Microsoft) in the following version.
* Database connections and secrets managed by admins only; connection test; password rotation without recreating monitors.
* Complete, filterable audit trail.
* Configurable retention: raw heartbeats 7 days, per-minute aggregates 90 days, per-hour 2 years.
* Workspace backup/export as YAML; import of monitors from Uptime Kuma.

## 7. Internationalization

* The whole product (code, identifiers, logs, API contracts, documentation) is written in English.
* The UI and user-facing backend messages (validation errors, alert/notification texts, incident reports) support **English (default)** and **Brazilian Portuguese (pt-BR)**.
* The language is selectable per user (profile setting); on the wall it is chosen via the URL parameter `?lang=pt-BR` (default `en`).
* Numbers, dates, durations and relative times are formatted via `Intl` / the active locale — never hand-built strings.

## 8. Suggested roadmap

1. **MVP (6–8 weeks)**: basic Security + 2FA, groups, HTTP and SQL monitors with preview and conditions, Telemetry, incidents with acknowledgement, email/Teams/webhook channels, wall with a fixed layout (the prototype).
2. **v1.1**: wall layout editor, value/table/ranking blocks, dependencies and cascade suppression, escalation, Push and Ping.
3. **v1.2**: history-based anomaly detection, query catalog, SLA reports, status page, Uptime Kuma import, SSO.
