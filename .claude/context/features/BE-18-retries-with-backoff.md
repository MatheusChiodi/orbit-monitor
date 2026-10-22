---
id: BE-18
title: "Retries with backoff"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-18 · Retries with backoff

## Summary
N attempts before marking down

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/RetryPolicy.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/RetryPolicyTest.java`

## Decisions and notes
- Exponential backoff capped at maxDelay; sleeper port for tests.
- Own record instead of resilience4j-retry: the probe needs only attempts, exponential delay and a cap, and a sleeper port keeps tests instant.
- Delays grow by `multiplier` and are capped at `maxDelay`; an interrupted sleep returns the last result and keeps the interrupt flag.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented exponential backoff with cap and sleeper port (status: done).
