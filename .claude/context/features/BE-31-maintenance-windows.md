---
id: BE-31
title: "Maintenance windows"
area: backend
group: "Alerting"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-31 · Maintenance windows

## Summary
One-off and recurring (cron), silence and exclude from uptime

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/MaintenanceWindow.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/CronExpression.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/suppression/MaintenanceSchedule.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/MaintenanceController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/TelemetryService.java`

## Tests
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/MaintenanceWindowTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/CronExpressionTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/suppression/MaintenanceScheduleTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/MaintenanceApiTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/TelemetryServiceTest.java`

## Decisions and notes
- One-off start/end or 5-field cron + duration in a zone; covers monitor or group ids; stored in orbit.maintenance.json.
- Validation (`MaintenanceWindow.problems`, run by the file validator): at least one target; one-off needs `end > start`; recurring needs a valid cron and a duration of 1 min to 1 day. Invalid -> `422 invalid-config` with the reasons.
- Silencing: `AlertingBeans.suppressed` asks `MaintenanceSchedule.inMaintenance([monitorId, groupId], now)` (plus silences), so neither notifications nor escalation steps go out during a window; incidents still open and show on the wall.
- Uptime (BE-20): `TelemetryService.setMaintenance` gets the occurrences of the windows covering the monitor or its group over the in-memory history (`orbit.history`, at most 62 days) and `status().uptime` leaves those heartbeats out, so the monitor detail, the wall and every caller of `TelemetryService.status` exclude maintenance. `MaintenanceSchedule.exclusions(targets, from, to)` is the hook for the history-based uptime of other modules.
- REST: `GET /api/maintenance` -> `[{id, name, targets, start, end, cron, durationMinutes, zone, reason, active}]`; `GET /api/maintenance/active`; `GET /api/maintenance/occurrences?from=&to=` (ISO instants, default now..+7 d, max 62 d) -> `[{windowId, name, targets, reason, start, end}]` for the calendar (FE-41); `PUT /api/maintenance/{id} {name, targets[], start?, end?, cron?, durationMinutes?, zone?, reason?}` (unknown zone 400); `DELETE /api/maintenance/{id}` (204/404). Audited as `maintenance.save|delete`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — one-off and cron windows implemented; uptime exclusion and alert silencing wiring pending.
- 2026-10-22 — orbit.maintenance.json validation and API, calendar occurrences, alert silencing and uptime exclusion wired (status: done).
