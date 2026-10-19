---
id: BE-12
title: "Query catalog"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-12 · Query catalog

## Summary
Saved, reusable SELECTs with owner and description

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/QueryCatalog.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/QueryCatalogTest.java`

## Decisions and notes
- Stored in `orbit.query-catalog.json`; SELECT validated by safe mode; connection must exist.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
