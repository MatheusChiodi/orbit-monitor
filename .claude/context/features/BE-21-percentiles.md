---
id: BE-21
title: "Percentiles"
area: backend
group: "Telemetry"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-21 · Percentiles

## Summary
p50/p95/p99 per window

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/Statistics.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/LatencySummary.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/StatisticsTest.java`

## Decisions and notes
- Nearest-rank p50/p95/p99 over OK/WARN checks; exposed in `GET /api/monitors/{id}` as `latency`.
- Pending: percentiles of SQL series values.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — latency percentiles.
