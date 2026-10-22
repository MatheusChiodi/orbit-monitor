---
id: CORE-20
title: "Local-first runtime"
area: full-stack
group: "Platform"
status: done
screens: [wall, reports-sla, settings]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-20 · Local-first runtime

## Summary
Runs entirely on the operator machine with no Orbit database; binds to 127.0.0.1; only outbound traffic is the configured checks and notifications; in-memory history with visible coverage.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md), [reports-sla](../screens/reports-sla.md), [settings](../screens/settings.md)

## Code
- `backend/orbit-api/src/main/resources/application.yml`
- `backend/orbit-api/src/main/java/io/orbit/api/config/OrbitProperties.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/RuntimeLifecycle.java`
- `backend/README.md`
- `frontend/src/domains/telemetry/history/history.ts`
- `frontend/src/shared/ui/HistoryNotice/HistoryNotice.tsx`
- `backend/orbit-api/src/main/java/io/orbit/api/web/FrontendController.java`
- `backend/orbit-api/pom.xml`
- `backend/orbit-api/src/main/java/io/orbit/api/web/HistoryController.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/HealthEndpointTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`
- `frontend/src/domains/telemetry/history/history.test.ts`
- `frontend/src/shared/ui/HistoryNotice/HistoryNotice.test.tsx`
- `backend/orbit-api/src/test/java/io/orbit/api/web/StaticFrontendTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/HistoryRuntimeApiTest.java`

## Decisions and notes
- No invented data: without a reachable backend the console shows "Cannot reach the Orbit server" with a retry and the wall shows "Waiting for the Orbit server…" and retries every 5 s. Demo data exists only behind an explicit `?demo` (`index.html?demo`, `wall.html?demo`), never as a silent fallback.
- Backend: No datasource for Orbit itself; binds to `127.0.0.1:8080` by default; config in `~/.orbit/config`, key in `~/.orbit/master.key` (both overridable).
- Backend: Scheduler ticks every second into an in-memory queue; virtual-thread workers (`orbit.workers`, default 4); config files are re-read every 5 s and the schedule resynced.
- Backend: Smoke-tested with the packaged jar: health UP, group saved to `orbit.groups.json`, wall snapshot served, OpenAPI at `/v3/api-docs`.
- Frontend: History coverage = span of points still in backend memory, capped by the window (24 h default); requested periods are clamped and flagged.
- Frontend: `HistoryNotice` (`role=note`) states "History available: last 24 h", the requested period that is not kept and the hours recorded since Orbit started.
- Backend: the built frontend ships in the jar: `maven-resources-plugin` copies `frontend/dist` (from `npx vite build`) to `static/` at `prepare-package` (nothing when not built). `/` serves the console `index.html`, `/wall` and `/wall/<slug>` forward to `wall.html` (`FrontendController`). Build: `cd frontend && npm ci && npx vite build`, then `cd backend && mvn -B package`.
- Backend: `GET /api/history/coverage` returns a localized `label` and `coveredDays` (see BE-52).
- Backend: verified 2026-10-22 that `mvn package` puts `frontend/dist` under `BOOT-INF/classes/static/` in `orbit-api.jar`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: local runtime wired and smoke-tested.
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: history coverage helpers and history notice.
- 2026-10-22 — backend: frontend served from static/ in the jar and history coverage label in the API.
- 2026-10-22 — backend items finished; packaging verified (status: done).
- 2026-10-22 — removed the silent demo fallback: unreachable server screen (console), waiting state with retry (wall), demo only with `?demo`.
