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
- `SqlProbe.execute(..., params, ...)` validates the SELECT, wraps the row limit, then turns `:name` into `?` and binds with `setObject`; the original overload delegates with no parameters.
- Scanner mirrors `SqlText.codeOnly`: literals, quoted identifiers, `[...]`, `--` and `/* */` comments and `::` casts are copied verbatim and never yield parameters. Names are `[A-Za-z_][A-Za-z0-9_]*`; a repeated name is bound at each position.
- `bind(sql, Map<String, ?>)` returns `Bound(sql with ?, values in order)` for `PreparedStatement.setObject`; missing names raise `UnsafeSqlException` `sql.missing-parameter` listing all of them; non-scalar values (lists, maps, arrays) raise `sql.parameter-type`. Null values are allowed (bound as SQL NULL).
- Alternative considered: Spring `NamedParameterJdbcTemplate`/`NamedParameterUtils` (adds spring-jdbc to the domain module and expands collections into IN lists, which changes the query shape); a small scanner keeps orbit-monitor dependency-free.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — SqlProbe binds named parameters with setObject; SqlProbeParametersTest active (status: in-progress, orbit-monitor SqlParametersTest still pending).
- 2026-10-22 — implemented `SqlParameters.names`/`bind` in orbit-monitor; probe binding still pending (status: in-progress).
