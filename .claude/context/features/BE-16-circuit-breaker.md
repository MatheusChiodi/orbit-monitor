---
id: BE-16
title: "Circuit breaker"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-16 · Circuit breaker

## Summary
3 consecutive failures pause the target for 1 min ("no response")

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/CircuitBreaker.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/CircuitBreakerTest.java`

## Decisions and notes
- 3 consecutive failures open for 1 min; half-open allows one trial.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
