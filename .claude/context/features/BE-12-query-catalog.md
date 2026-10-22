---
id: BE-12
title: "Query catalog"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-12 · Query catalog

## Summary
Saved, reusable SELECTs with owner and description

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/QueryCatalog.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/DefinitionValidators.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/QueryCatalogTest.java`

## Decisions and notes
- Stored in `orbit.query-catalog.json`; SELECT validated by safe mode; connection must exist.
- `QueryCatalog.save` validates id, name, connectionId and the SELECT (safe mode, `DefinitionValidators.savedQueries`), checks the connection in `MonitorDefinitions`, stamps `updatedAt`/`updatedBy` (normalized operator name) and replaces by id. `QueryCatalog.open(dir, mapper, definitions)` wires the same validator into the file. `byConnection` is sorted by name.
- The catalog holds SQL text only, never results or credentials. API wiring (orbit-api) is a follow-up.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented the query catalog over orbit.query-catalog.json (status: done).
