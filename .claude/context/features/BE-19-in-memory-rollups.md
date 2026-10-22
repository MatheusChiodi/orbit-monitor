---
id: BE-19
title: "In-memory rollups"
area: backend
group: "Telemetry"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-19 · In-memory rollups

## Summary
1m/1h rollups in bounded ring buffers; window configurable (24 h default)

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/HeartbeatStore.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/Statistics.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/Rollups.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/HistoryRecorder.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/SeriesMetrics.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/HeartbeatStoreTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/MinuteSeriesTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/RollupsTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/HistoryRecorderTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/HistoryRuntimeApiTest.java`

## Decisions and notes
- Raw heartbeats in per-monitor ring buffers (window `orbit.history`, default 24 h, max 20 000 per monitor); per-minute series computed on demand for the wall.
- Everything in memory is lost on restart by design; durable rollups live in the history log (CORE-22).
- `Rollups.of(heartbeats, bucket)` buckets by epoch-aligned windows (1 min, 1 h), oldest first, empty buckets omitted; min/max/avg over the primary value (null without values), `upRatio` = non-DOWN share, `p95Latency` over answering checks (0 when none).
- Pure JDK, computed on demand from the ring buffer; alternatives considered: a streaming t-digest/HdrHistogram (extra dependency, overkill for <= 20 000 points per monitor) and Micrometer timers (global registry, no per-bucket replay). Writing the rollups to the 30-day history log (CORE-22) belongs to orbit-history.
- 2026-10-22: rollups reach the 30-day log: heartbeats and now series points (`HistoryStore.recordSeries`, key `monitorId/field`) are rolled into 1-minute and 1-hour buckets by the store (CORE-22) and read with `GET /api/history/{id}?resolution=1m|1h` and `GET /api/history/{id}/series`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — in-memory heartbeats and per-minute series.
- 2026-10-18 — pending tests for 1m/1h rollups.
- 2026-10-22 — 1m/1h rollups implemented; pending tag removed from RollupsTest (status: done).
- 2026-10-22 — series points written to the history log, where the store keeps their 1-minute/1-hour rollups.
