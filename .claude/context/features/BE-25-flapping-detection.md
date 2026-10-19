---
id: BE-25
title: "Flapping detection"
area: backend
group: "Telemetry"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-25 · Flapping detection

## Summary
N state changes in M minutes → `FLAPPING`, one incident

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/FlappingDetector.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/FlappingDetectorTest.java`

## Decisions and notes
- N confirmed changes within M minutes = flapping (default 4 in 10 min); alerting keeps one incident.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
