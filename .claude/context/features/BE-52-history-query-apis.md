---
id: BE-52
title: "History, events and audit query APIs"
area: backend
group: "History"
status: done
screens: [reports-sla, incident-detail, audit-log]
spec: docs/08-logs-and-history.md
updated: 2026-10-22
---

# BE-52 · History, events and audit query APIs

## Summary
GET /api/history (auto resolution), /api/events, /api/audit; streaming, index-driven, redacted exports.

## Status
- [x] Tests written (pending or active)
- [x] Implemented (audit records reach the disk once `AuditLog` forwards to the store)
- [x] All tests green, none pending

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/config/HistoryBeans.java` — `HistoryStore` under `orbit.data-dir`, settings `orbit.history-store.*`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/HistoryRecorder.java` — event bus → store (checks, state changes, incident steps)
- `backend/orbit-api/src/main/java/io/orbit/api/web/HistoryController.java`
- `backend/orbit-api/src/main/resources/application.yml` (`orbit.data-dir`, `orbit.history-store`), test `application.properties` (temporary data dir)
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/AuditForwarder.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/DomainBeans.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/DefinitionValidators.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/HistoryApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/HistoryRuntimeApiTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/HistoryRecorderTest.java`

## Decisions and notes
- Endpoints:
  - `GET /api/history/{monitorId}?from&to&resolution=auto|raw|1m|1h` → `{monitorId, from, to, resolution, coverage, samples | buckets}`; defaults to the last 24 h; auto = ≤ 6 h raw, ≤ 7 d 1-minute, otherwise 1-hour; spans over 31 days or bad instants → 400.
  - `GET /api/history/{monitorId}/summary?from&to` → samples, down, uptime % (WARN counts as up, UNKNOWN left out), p50/p95/p99.
  - `GET /api/history/{monitorId}/export?from&to&format=csv|json` → streamed `StreamingResponseBody` (CSV or JSON Lines), error codes redacted again, CSV cells protected against formula injection.
  - `GET /api/history/coverage` (`oldest`, `newest`, `retentionDays`, `rawWritesEnabled`) and `GET /api/history/health` (self-monitoring).
  - `GET /api/events?from&to&type&monitorId&limit` (`state.change`, `incident.opened|acknowledged|commented|resolved|…`).
  - `GET /api/history/audit?from&to&actor&entity&limit` — the 30-day audit trail on disk. The existing in-memory `/api/audit` (AuditController, orbit-security) is left untouched to avoid a breaking change.
- Error codes are the first token of the probe error (`TIMEOUT`, `SQLTimeoutException`), max 40 chars, never the free text.
- Settings come from `application.yml` (`orbit.history-store.retention-days|max-disk-mb|min-free-disk-mb`) until `OrbitSettings` (orbit.settings.json) gains `history.*` fields.
- `GET /api/history/{monitorId}/series?field=<column or JSONPath>&from&to&resolution=auto|raw|1m|1h` → `{monitorId, field, from, to, resolution, samples | buckets}`: series points written for fields kept as series (SQL columns, BE-23 JSONPaths, Kafka lag, days left).
- `GET /api/history/coverage` now returns `{oldest, newest, retentionDays, rawWritesEnabled, coveredDays, label}`; `label` is localized (`History available: last 30 days` / `Histórico disponível: últimos 30 dias`).
- Every `AuditLog` line is also forwarded to the store (`AuditForwarder`, sink in `DomainBeans`), so `/api/history/audit` holds the 30-day trail; a store failure never breaks the audited action.
- Monitor ids `coverage`, `health` and `audit` are reserved (validation error `id is reserved`) so they never collide with the fixed sub-paths.
- Notices (`cert.warning`) are written as history events.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — history, summary, export, coverage, health, events and on-disk audit endpoints wired to the store (status: in-progress until audit forwarding lands).
- 2026-10-22 — audit forwarding, series endpoint, localized coverage label and reserved ids (status: done).
