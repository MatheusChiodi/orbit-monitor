---
id: BE-13
title: "Catalog introspection"
area: backend
group: "Probes"
status: tests-pending
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# BE-13 · Catalog introspection

## Summary
Tables/columns for autocomplete, cached per connection

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/sql/CatalogIntrospector.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/sql/CatalogIntrospectorTest.java`

## Decisions and notes
- JDBC DatabaseMetaData, system schemas excluded, cached per connection with TTL and max tables.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
