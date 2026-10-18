---
id: CORE-05
title: "State, hysteresis, uptime and p95"
area: backend
group: "Telemetry"
status: done
screens: [wall, reports-sla]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-05 · State, hysteresis, uptime and p95

## Summary
In-memory heartbeats (24 h window by default, lost on restart), state with hysteresis (default 10%), uptime and percentiles over the available window.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md), [reports-sla](../screens/reports-sla.md)

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/condition/Hysteresis.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/HeartbeatStore.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/StateTracker.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/Statistics.java`
- `backend/orbit-telemetry/src/main/java/io/orbit/telemetry/TelemetryService.java`
- `backend/orbit-common/src/main/java/io/orbit/common/event/MonitorStateChanged.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/condition/HysteresisTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/HeartbeatStoreTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/StateTrackerTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/StatisticsTest.java`
- `backend/orbit-telemetry/src/test/java/io/orbit/telemetry/TelemetryServiceTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/CheckRunnerTest.java`

## Decisions and notes
- Hysteresis is applied at evaluation time (raw values never leave the probe): while WARN/DOWN, thresholds tighten by the ratio (default 10%): `< 200` recovers below 180, `> 50` above 55, ranges shrink, `newer than 10min` becomes 9 min. Equality, lists and text are never tightened.
- DOWN is confirmed after `downAfter` consecutive failures (retries); WARN and recovery are immediate. `MonitorStateChanged.since` is the first failing check.
- Heartbeats live in per-monitor ring buffers bounded by window (24 h) and count; `coverageStart` feeds the 'history available since' label.
- Uptime counts WARN as up and ignores UNKNOWN; percentiles use nearest rank over OK/WARN checks only.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — hysteresis, retries, in-memory heartbeats, uptime and p50/p95/p99 implemented (status: done).
