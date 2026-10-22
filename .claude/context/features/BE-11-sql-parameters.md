---
id: BE-11
title: "SQL parameters"
area: backend
group: "Probes"
status: done
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
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/sql/SqlParameters.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/sql/SqlProbe.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/SqlMonitorDef.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/DefinitionValidators.java`
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckRunner.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/PreviewService.java`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/sql/SqlParametersTest.java`
- `backend/orbit-probe/src/test/java/io/orbit/probe/sql/SqlProbeParametersTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/ExtendedDefinitionsTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeExtendedTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/SqlEditorApiTest.java`

## Decisions and notes
- `:name` placeholders become `?` bound with setObject; literals, comments and `::` casts are ignored; missing values are rejected.
- `SqlProbe.execute(..., params, ...)` validates the SELECT, wraps the row limit, then turns `:name` into `?` through `SqlParameters.bind` (single parser shared with orbit-monitor) and binds with `setObject`; the original overload delegates with no parameters.
- Scanner mirrors `SqlText.codeOnly`: literals, quoted identifiers, `[...]`, `--` and `/* */` comments and `::` casts are copied verbatim and never yield parameters. Names are `[A-Za-z_][A-Za-z0-9_]*`; a repeated name is bound at each position.
- `bind(sql, Map<String, ?>)` returns `Bound(sql with ?, values in order)` for `PreparedStatement.setObject`; missing names raise `UnsafeSqlException` `sql.missing-parameter` listing all of them; non-scalar values (lists, maps, arrays) raise `sql.parameter-type`. Null values are allowed (bound as SQL NULL).
- Alternative considered: Spring `NamedParameterJdbcTemplate`/`NamedParameterUtils` (adds spring-jdbc to the domain module and expands collections into IN lists, which changes the query shape); a small scanner keeps orbit-monitor dependency-free.
- Wired 2026-10-22: `orbit.selects.json` `parameters: {name: value}`; saving fails when a `:name` has no value; the runtime binds them through `CheckRunner.runSql(..., params, ...)`. Workspace variables inside values are resolved by the variables feature (be-workspace).
- Preview: `POST /api/monitors/preview` accepts `parameters`; a `:name` without a value is a 422 `sql.missing-parameter`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — SqlProbe binds named parameters with setObject; SqlProbeParametersTest active (status: in-progress, orbit-monitor SqlParametersTest still pending).
- 2026-10-22 — implemented `SqlParameters.names`/`bind` in orbit-monitor; probe binding still pending (status: in-progress).
- 2026-10-22 — SqlProbe now uses `SqlParameters.bind`; probe-local `NamedParameters` removed; no pending tests left (status: done).
- 2026-10-22 — parameters stored with SQL monitors, validated and bound by the runtime.
- 2026-10-22 — parameters accepted by the SQL preview.
