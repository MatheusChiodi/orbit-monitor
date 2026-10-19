---
id: BE-15
title: "Per-target isolation"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-15 · Per-target isolation

## Summary
Dedicated HikariCP pool (max 2–3) and one query at a time per connection

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/resilience/TargetLimiter.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/resilience/TargetLimiterTest.java`

## Decisions and notes
- One query at a time per connection on top of the small HikariCP pool (already in `ConnectionPools`).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
