---
id: BE-19
title: "In-memory rollups"
area: backend
group: "Telemetry"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-19 · In-memory rollups

## Summary
1m/1h rollups in bounded ring buffers; window configurable (24 h default)

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/HeartbeatStore.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/Statistics.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/HeartbeatStoreTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/MinuteSeriesTest.java`

## Decisions and notes
- Raw heartbeats in per-monitor ring buffers (window `orbit.history`, default 24 h, max 20 000 per monitor); per-minute series computed on demand for the wall.
- Hour/day rollups are pending; everything is lost on restart by design.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — in-memory heartbeats and per-minute series.
