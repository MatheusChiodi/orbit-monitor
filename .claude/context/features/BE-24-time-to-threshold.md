---
id: BE-24
title: "Time to threshold"
area: backend
group: "Telemetry"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-24 · Time to threshold

## Summary
Linear regression forecasts when a series crosses its threshold

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/ThresholdForecast.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/ThresholdForecastTest.java`

## Decisions and notes
- Least-squares line over recent points; empty when flat, moving away or fewer than 3 points.
- Ordinary least squares in plain Java (seconds from the first point); the side of the limit comes from the first point (below = upper limit, needs a rising slope; above = lower limit, needs a falling one). A last value already past the limit returns its time; a crossing fitted in the past is clamped to the last point.
- Alternative considered: Apache Commons Math `SimpleRegression` (same result, extra 2 MB dependency); not added.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — least-squares time to threshold implemented; pending tag removed (status: done).
