---
id: BE-14
title: "Query cost warning"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-14 · Query cost warning

## Summary
Preview time and `EXPLAIN` when supported; suggests a longer interval

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/QueryCostAdvisor.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/QueryCostAdvisorTest.java`

## Decisions and notes
- NONE < 1 s; WARN suggests interval >= 60x preview time; HEAVY >= 10 s suggests >= 15 min and a view. EXPLAIN is a follow-up.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
