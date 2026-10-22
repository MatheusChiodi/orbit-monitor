---
id: BE-20
title: "Uptime and SLA"
area: backend
group: "Telemetry"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-20 · Uptime and SLA

## Summary
Excludes maintenance windows; computed over the in-memory window and states its coverage

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/Statistics.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/UptimeReport.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/TimeRange.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/TelemetryService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/StatisticsTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/UptimeMaintenanceTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/TelemetryServiceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/MaintenanceApiTest.java`

## Decisions and notes
- Uptime counts WARN as up and ignores UNKNOWN, over the heartbeats in memory only; `coverageFrom` tells how far back the data goes (7 d / 30 d / monthly SLA are only as long as the window).
- Still open (no pending test): per-group uptime endpoint.
- `Statistics.uptime(heartbeats, excluded)` drops heartbeats inside any maintenance `TimeRange` (half-open) and reuses the plain uptime, so `coverageFrom` is the oldest counted heartbeat; with no windows it equals `uptime(heartbeats)`.
- Maintenance windows from orbit.maintenance.json are now fed into `TelemetryService.status().uptime` (BE-31 wiring in `AlertingBeans`); history-log based uptime can use `MaintenanceSchedule.exclusions`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — uptime over the in-memory window with coverage.
- 2026-10-18 — pending tests for maintenance exclusion.
- 2026-10-22 — maintenance windows excluded from uptime; pending tag removed from UptimeMaintenanceTest (status: done).
- 2026-10-22 — alerting maintenance windows fed into the in-memory uptime.
