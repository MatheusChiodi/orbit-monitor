---
id: BE-22
title: "Anomaly detection"
area: backend
group: "Telemetry"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-22 · Anomaly detection

## Summary
Deviation vs same-hour baseline of the last week; z-score

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/AnomalyDetector.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/AnomalyDetectorTest.java`

## Decisions and notes
- z-score against same-hour values of previous days within the memory window (a full week only if the window allows); no verdict with too few samples or zero deviation.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
