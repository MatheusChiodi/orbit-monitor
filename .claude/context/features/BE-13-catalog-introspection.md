---
id: BE-13
title: "Catalog introspection"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-13 · Catalog introspection

## Summary
Tables/columns for autocomplete, cached per connection

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-probe/src/main/java/io/orbit/probe/sql/CatalogIntrospector.java`

## Tests
- `backend/orbit-probe/src/test/java/io/orbit/probe/sql/CatalogIntrospectorTest.java`

## Decisions and notes
- JDBC DatabaseMetaData, system schemas excluded, cached per connection with TTL and max tables.
- Plain JDBC `DatabaseMetaData` (no schema-crawler dependency): one `getTables` and one `getColumns` call per refresh on a read-only connection; only names and types are read, never rows.
- Cache per connection id with TTL from the injected clock, `invalidate` on connection edits; system schemas of H2, PostgreSQL, MySQL, Oracle and SQL Server are excluded; at most `maxTables` tables.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented JDBC catalog introspection with per-connection TTL cache (status: done).
