---
id: BE-11
title: "SQL parameters"
area: backend
group: "Probes"
status: in-progress
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-11 · SQL parameters

## Summary
`:param` bound from fixed values or workspace variables, never string-concatenated

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/SqlParameters.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/sql/SqlProbe.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/sql/NamedParameters.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/SqlParametersTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/sql/SqlProbeParametersTest.java`

## Decisions and notes
- `:name` placeholders become `?` bound with setObject; literals, comments and `::` casts are ignored; missing values are rejected.
- `SqlProbe.execute(..., params, ...)` validates the SELECT, wraps the row limit, then turns `:name` into `?` (package-private `NamedParameters`) and binds with `setObject`; the original overload delegates with no parameters.
- `orbit-monitor` `SqlParameters` (and its pending test) is not implemented yet; once it is, `NamedParameters` should be replaced by it to avoid two parsers.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — SqlProbe binds named parameters with setObject; SqlProbeParametersTest active (status: in-progress, orbit-monitor SqlParametersTest still pending).
