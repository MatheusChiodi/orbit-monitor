---
id: BE-24
title: "Time to threshold"
area: backend
group: "Telemetry"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-24 · Time to threshold

## Summary
Linear regression forecasts when a series crosses its threshold

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/ThresholdForecast.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/ThresholdForecastTest.java`

## Decisions and notes
- Least-squares line over recent points; empty when flat, moving away or fewer than 3 points.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
