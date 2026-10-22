---
id: BE-17
title: "Execution windows"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-17 · Execution windows

## Summary
Business hours/weekdays, timezone-aware

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/ExecutionWindow.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/WindowDef.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/RuntimeBeans.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/ExecutionWindowTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/ExtendedDefinitionsTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeExtendedTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/ExtendedMonitorsApiTest.java`

## Decisions and notes
- Days + local time range in a zone; end exclusive; ranges may cross midnight.
- `java.time` only; start inclusive, end exclusive, equal start and end is the whole day; for an overnight window the day that counts is the day the window started.
- Wired 2026-10-22: every monitor accepts `window: {days: [MONDAY..], from: "08:00", to: "18:00", zone: "America/Sao_Paulo"}` (validated: day names, HH:mm, IANA zone). Workers call `MonitorRuntime.runScheduled`, which skips the check while the window is closed (no heartbeat, last state kept); "Test now" (`POST /api/monitors/{id}/run`) always runs.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented timezone-aware windows, including across midnight (status: done).
- 2026-10-22 — execution windows stored with every monitor type and applied by the scheduled workers.
