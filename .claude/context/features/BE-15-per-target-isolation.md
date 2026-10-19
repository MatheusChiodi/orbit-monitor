---
id: BE-15
title: "Per-target isolation"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-15 · Per-target isolation

## Summary
Dedicated HikariCP pool (max 2–3) and one query at a time per connection

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/TargetLimiter.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/ConnectionPools.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/TargetLimiterTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`

## Decisions and notes
- One check at a time per target (SQL: connection id, HTTP: host); a caller waits up to the monitor timeout, then the check is DOWN with "another query is still running".
- Each connection has its own read-only HikariCP pool (max 1-3).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — per-target limiter wired into the runtime (status: done).
