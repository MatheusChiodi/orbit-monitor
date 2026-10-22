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

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/FlappingDetectorTest.java`

## Decisions and notes
- N confirmed changes within M minutes = flapping (default 4 in 10 min); alerting keeps one incident.
- Sliding window per monitor (deque of change times, pruned on each call so memory stays bounded); flapping when the changes within `[now - window, now]` reach `maxChanges`. `forget(monitorId)` drops a removed monitor. Wiring into incident handling (single incident while flapping) is still to be done in the runtime.
- Alternative considered: Nagios-style weighted percent-state-change over the last 21 checks; the simpler N-in-M rule matches the spec and is easier to explain in the UI.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — N-changes-in-M-minutes sliding window implemented; pending tag removed (status: done).
