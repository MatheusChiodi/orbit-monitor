---
id: CORE-20
title: "Local-first runtime"
area: full-stack
group: "Platform"
status: in-progress
screens: [wall, reports-sla, settings]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-20 · Local-first runtime

## Summary
Runs entirely on the operator machine with no Orbit database; binds to 127.0.0.1; only outbound traffic is the configured checks and notifications; in-memory history with visible coverage.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[wall](../screens/wall.md), [reports-sla](../screens/reports-sla.md), [settings](../screens/settings.md)

## Code
- `backend/orbit-api/src/main/resources/application.yml`
- `backend/orbit-api/src/main/java/io/orbit/api/config/OrbitProperties.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/RuntimeLifecycle.java`
- `backend/README.md`
- `frontend/src/domains/telemetry/history/history.ts`
- `frontend/src/shared/ui/HistoryNotice/HistoryNotice.tsx`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/HealthEndpointTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`
- `frontend/src/domains/telemetry/history/history.test.ts`
- `frontend/src/shared/ui/HistoryNotice/HistoryNotice.test.tsx`

## Decisions and notes
- Backend: No datasource for Orbit itself; binds to `127.0.0.1:8080` by default; config in `~/.orbit/config`, key in `~/.orbit/master.key` (both overridable).
- Backend: Scheduler ticks every second into an in-memory queue; virtual-thread workers (`orbit.workers`, default 4); config files are re-read every 5 s and the schedule resynced.
- Backend: Smoke-tested with the packaged jar: health UP, group saved to `orbit.groups.json`, wall snapshot served, OpenAPI at `/v3/api-docs`.
- Backend: Pending: serving the built frontend from `static/`, history coverage label in the API.
- Frontend: History coverage = span of points still in backend memory, capped by the window (24 h default); requested periods are clamped and flagged.
- Frontend: `HistoryNotice` (`role=note`) states "History available: last 24 h", the requested period that is not kept and the hours recorded since Orbit started.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: local runtime wired and smoke-tested.
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: history coverage helpers and history notice.
