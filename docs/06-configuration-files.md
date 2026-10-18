# Orbit Monitor — Configuration Files

Orbit has **no database of its own** and **no login**. Everything the operator configures in the console is saved in **one JSON file per feature**, created on demand the first time that feature stores something. Runtime data (heartbeats, series, incidents, timeline) lives in memory only.

> These files contain connection details and encrypted secrets. **They are never committed.** Only `*.example.json` and `*.schema.json` files belong in the repository.

## 1. Location

| Setting | Default |
|---|---|
| Directory | `~/.orbit/config/` |
| Override | `ORBIT_CONFIG_DIR` environment variable or `--orbit.config-dir=<path>` |
| Master key | `~/.orbit/master.key` (generated on first run, never inside the config directory) |

The directory and the master key are created with permissions restricted to the current user when the OS allows it.

## 2. One file per feature

| File | Owner domain | Contents |
|---|---|---|
| `orbit.settings.json` | Security / Workspace | Access policy, bind/LAN, default locale, theme, animation level, density, in-memory history window |
| `orbit.connections.json` | Monitor | Database connections (driver, host, port, database, user, **encrypted** password, pool size) |
| `orbit.requests.json` | Monitor | HTTP monitors: method, URL, headers, body, auth (secrets encrypted), conditions, fields and display |
| `orbit.selects.json` | Monitor | SQL monitors: `connectionId`, SELECT, parameters, conditions, fields and display |
| `orbit.query-catalog.json` | Monitor | Saved reusable SELECTs |
| `orbit.checks.json` | Monitor | TCP, Ping, DNS, Push, gRPC and Kafka checks |
| `orbit.groups.json` | Workspace | Workspaces, groups, tags, ordering |
| `orbit.dependencies.json` | Workspace | Dependencies between groups and monitors |
| `orbit.layouts.json` | Workspace | Wall layouts, blocks, playlists |
| `orbit.themes.json` | Workspace | Custom color themes |
| `orbit.channels.json` | Alerting | Notification channels (tokens and webhook secrets encrypted) |
| `orbit.escalation.json` | Alerting | Escalation policies |
| `orbit.oncall.json` | Alerting | On-call schedules |
| `orbit.maintenance.json` | Alerting | Maintenance windows |
| `orbit.silences.json` | Alerting | Silences/snoozes with reason and expiry |
| `orbit.notification-templates.json` | Alerting | Message templates (en / pt-BR) |
| `orbit.variables.json` | Workspace | Workspace variables used by SQL parameters and requests |
| `orbit.status-pages.json` | Workspace | Status page definitions |

**Rule:** a new feature that needs to persist configuration gets its own `orbit.<feature>.json`, with a schema and an example file. Domains read and write only their own files; cross-file references use `id`s (`selects[].connectionId`, `requests[].groupId`) and are validated at load time.

## 3. File format

```json
{
  "version": 1,
  "items": [
    {
      "id": "sel_reconciliation_queue",
      "name": "Reconciliation queue",
      "groupId": "grp_payments",
      "connectionId": "con_core_oracle",
      "sql": "SELECT COUNT(*) AS PENDING_QTY FROM V_RECONCILIATION_PENDING",
      "intervalSeconds": 60,
      "conditions": [{ "expression": "[COL].PENDING_QTY < 200", "level": "DOWN" }],
      "fields": [{ "key": "PENDING_QTY", "label": "Pending", "format": "integer", "series": true, "display": "big-number" }],
      "updatedAt": "2026-10-18T20:00:00Z",
      "updatedBy": "M. Chiodi"
    }
  ]
}
```

- `version` drives migrations; older files are migrated on load and rewritten.
- Every file has a JSON Schema (`orbit.<feature>.schema.json`), validated on read and on write. An invalid file is never overwritten: Orbit keeps serving the last valid copy and reports the error in the console.
- `updatedBy` is the self-declared operator name.

## 4. Writing safely

1. Validate against the schema and cross-file references.
2. Write to `orbit.<feature>.json.tmp`, flush, then atomically rename over the original.
3. Keep the previous version as `orbit.<feature>.json.bak`.
4. One lock per file; concurrent writes are serialized.
5. External edits are detected (file watcher) and reloaded after validation.

## 5. Secrets

Secrets are **never** stored in plain text:

| Form | Example | Use |
|---|---|---|
| Encrypted | `"password": { "enc": "v1:base64…" }` | Default when typed in the console (AES-256-GCM with `master.key`) |
| Environment reference | `"password": "${env:CORE_DB_PASSWORD}"` | When the secret is managed outside Orbit |

The API never returns secrets; the console shows `•••• (vault)`. Exports omit secrets.

## 6. Never committed

- `.gitignore` ignores `orbit.*.json`, `orbit-data/`, `*.json.bak` and `*.json.tmp`, allowing only `*.example.json` and `*.schema.json`.
- A tracked pre-commit hook (`.githooks/pre-commit`) blocks commits that contain Orbit config files, `master.key`, or values that look like card numbers or private keys. Enable it once per clone: `git config core.hooksPath .githooks`.
- Example files live in `backend/config-examples/`; a unit test fails if any example contains a real-looking secret, card number or CPF.

## 7. In-memory runtime data

| Data | Storage | Default window |
|---|---|---|
| Heartbeats, series, rollups | Ring buffers in memory | 24 h (configurable, bounded by memory) |
| Incidents and timeline | Memory | 24 h after resolution |
| Recent audit entries | Memory + structured JSON log (masked) | 24 h in memory |

Everything in memory is lost on restart. Features that need long history (7 d / 30 d uptime, monthly SLA, week-over-week comparison, anomaly baselines) work only within the available window and say so in the UI ("History available: last 24 h"). Persistent history may come later through a storage port, without changing the domains.

## 8. Export and import

The console can export all configuration files as a single archive (secrets omitted) and import it back, with a dry-run diff before applying.
