---
id: BE-25
title: "Flapping detection"
area: backend
group: "Telemetry"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-25 · Flapping detection

## Summary
N state changes in M minutes → `FLAPPING`, one incident

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/FlappingDetector.java`
- `backend/orbit-alerting/src/main/java/io/orbit/alerting/IncidentService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/AlertingBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/AlertingTicker.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/FlappingDetectorTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/IncidentLifecycleTest.java`
- `backend/orbit-alerting/src/test/java/io/orbit/alerting/channel/NotificationDispatcherTest.java`

## Decisions and notes
- N confirmed changes within M minutes = flapping (default 4 in 10 min); alerting keeps one incident.
- Sliding window per monitor (deque of change times, pruned on each call so memory stays bounded); flapping when the changes within `[now - window, now]` reach `maxChanges`. `forget(monitorId)` drops a removed monitor.
- Alternative considered: Nagios-style weighted percent-state-change over the last 21 checks; the simpler N-in-M rule matches the spec and is easier to explain in the UI.
- Wired: `AlertingBeans` plugs a `FlappingDetector(4, 10 min)` into `IncidentService` (`Flapping` port). While flapping the open incident gets `flapping: true` and a `FLAPPING_STARTED` event, recoveries do not resolve it and severity changes are not recorded, so it stays one incident. `AlertingTicker` calls `IncidentService.settle` every 15 s: once the window has no more changes it adds `FLAPPING_STOPPED` and resolves when the monitor is OK. Channels get one "<monitor> is flapping" notification.
- FLAPPING is an incident flag (`Incident.flapping`), not a new `MonitorState`, so the wall/state contract stays OK/WARN/DOWN/UNKNOWN.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — N-changes-in-M-minutes sliding window implemented; pending tag removed (status: done).
- 2026-10-22 — wired into incident handling: FLAPPING flag, one incident, settle timer and one notification.
