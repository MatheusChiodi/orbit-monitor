---
id: BE-18
title: "Retries with backoff"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-18 · Retries with backoff

## Summary
N attempts before marking down

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/RetryPolicy.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/RetryPolicyTest.java`

## Decisions and notes
- Exponential backoff capped at maxDelay; sleeper port for tests.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
