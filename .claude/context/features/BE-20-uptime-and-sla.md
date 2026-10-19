---
id: BE-20
title: "Uptime and SLA"
area: backend
group: "Telemetry"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-20 · Uptime and SLA

## Summary
Excludes maintenance windows; computed over the in-memory window and states its coverage

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/Statistics.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/UptimeReport.java`

## Tests
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/StatisticsTest.java`

## Decisions and notes
- Uptime counts WARN as up and ignores UNKNOWN, over the heartbeats in memory only; `coverageFrom` tells how far back the data goes (7 d / 30 d / monthly SLA are only as long as the window).
- Pending: maintenance windows excluded from uptime, per-group uptime endpoint.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — uptime over the in-memory window with coverage.
