---
id: BE-16
title: "Circuit breaker"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-16 · Circuit breaker

## Summary
3 consecutive failures pause the target for 1 min ("no response")

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/CircuitBreaker.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/CircuitBreakerTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeTest.java`

## Decisions and notes
- 3 consecutive failed checks on a target open the circuit for 1 min; checks then report DOWN "No response: target paused" without touching the target; after the pause one trial decides.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-18 — circuit breaker wired into the runtime (status: done).
