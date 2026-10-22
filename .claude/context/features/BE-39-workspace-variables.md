---
id: BE-39
title: "Workspace variables"
area: backend
group: "Workspace and configuration"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-39 · Workspace variables

## Summary
`${var:name}` and `${vault:name}` references

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/variable/VariableResolver.java`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/variable/VariableService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/VariableController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/config/WorkspaceBeans.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/MonitorRuntime.java` (resolution at run time)
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/SqlMonitorDef.java` (`parameters`)
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/DefinitionValidators.java` (URLs with references)
- `backend/orbit-probe/src/main/java/io/orbit/probe/CheckRunner.java` (runSql with parameters)
- `backend/config-examples/orbit.variables.example.json`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/variable/VariableResolverTest.java`
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/variable/VariableServiceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/runtime/MonitorRuntimeVariablesTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/WorkspaceConfigApiTest.java` (variables)
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/MonitorDefinitionsTest.java` (URLs with references)

## API
| Method | Path | Body / response |
|---|---|---|
| GET | `/api/variables` | `{ version: 1, items: View[] }` (anyone) |
| GET | `/api/variables/{id}` | `View` |
| POST | `/api/variables` | `{ id?, name, kind: "var"\|"vault", value, description? }` → 201 `View`; id defaults to `var_<name>`; 409 when the id exists |
| PUT | `/api/variables/{id}` | same body → `View` (editors) |
| DELETE | `/api/variables/{id}` | 204 (editors) |

`View = { id, name, kind: "var"|"vault", value, description, updatedAt, updatedBy }`; for `vault` the value is `•••• (vault)` or the `${env:NAME}` reference, never the secret. For `vault`, `value` in the body is the plain secret (sealed with AES-256-GCM before it is written), a `${env:NAME}` reference, or null/empty to keep the stored secret. Audit `variable.save` / `variable.delete` records name and kind only.

## Decisions and notes
- `${var:name}` from orbit.variables.json, `${vault:name}` decrypted only at use time; masked variant for previews/logs; unknown names fail.
- `VariableResolver`: single-pass regex substitution of `${var:name}` / `${vault:name}` / `${env:NAME}` (names `[A-Za-z_][A-Za-z0-9_.-]*`); a substituted value is never expanded again (no injection through variable values); unknown names fail naming the variable, never a value. `${env:...}` is resolved only when an environment lookup is given (the runtime); `resolveMasked` shows `••••` for vault and env values and never decrypts. No dependency (plain `java.util.regex`; template engines such as Apache Commons Text `StringSubstitutor` were considered and rejected: recursive substitution by default and an extra dependency for a 70-line need).
- Store: `VariableService` over `orbit.variables.json` (schema in orbit-config). An item has either `value` (plain) or `secret` (`{"enc":"v1:..."}` or `"${env:NAME}"`). Names are unique; ids `[a-z][a-z0-9_-]{1,63}`; values up to 4096 characters; card numbers are refused by `ConfigFile`.
- Run time: `MonitorRuntime` asks `VariableService.resolver()` once per check (so edits apply on the next run) and resolves the HTTP URL, header values and body, and the text values of SQL `parameters` (`orbit.selects.json` → `parameters: { name: value }`, bound with `PreparedStatement.setObject`, never concatenated). An unknown variable or missing env var makes the check DOWN with an error naming it. The SSRF guard runs on the resolved URL inside the probe. Secret headers stay `SecretRef`s.
- `MonitorRequest` accepts `parameters` for SQL monitors; request URLs may contain references (validated with placeholders).
- Kept the old `MonitorRuntime`/`SqlMonitorDef` constructors (delegating) so other modules and tests compile unchanged.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — VariableResolver implemented; VariableResolverTest un-pended (store and runtime wiring pending).
- 2026-10-22 — orbit.variables.json store and /api/variables CRUD (vault values sealed, never returned); ${var}/${vault}/${env} resolved in HTTP URL/headers/body and SQL parameters at run time (status: done).
