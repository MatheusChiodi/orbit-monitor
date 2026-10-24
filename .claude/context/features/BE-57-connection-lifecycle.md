---
id: BE-57
title: "Connection lifecycle: draft test, usage, safe delete"
area: backend
group: "Monitors"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-57 · Connection lifecycle: draft test, usage, safe delete

## Summary
Test a connection before saving it, see how many monitors use each one, and never delete one in use by accident.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/ConnectionController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/runtime/ConnectionPools.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/MonitorDefinitions.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/ConnectionLifecycleApiTest.java`
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/definition/MonitorEditsTest.java` (`connectionUsersAreListedAndDeletionNeedsForce`)

## API
| Method | Path | Body / response |
|---|---|---|
| POST | `/api/connections/test` | `{ id?, name, jdbcUrl, username, password?, passwordEnv? }` → 200 `{ ok, ms, error }`; nothing is saved; with `id` of a saved connection and no password, its stored password is used; 400 without `jdbcUrl` or with an unsupported one |
| GET | `/api/connections` | each item now has `usedBy: number` (SELECT monitors reading from it) |
| DELETE | `/api/connections/{id}` | unused → 204; in use → 409 Problem `{ code: "connection-in-use", usedBy: [{ id, name }] }`; 404 unknown |
| DELETE | `/api/connections/{id}?force=true` | pauses the monitors that use it, then deletes → 204 |

Audit: `connection.test` (target id or `draft`, detail JDBC URL), `connection.delete` (detail `forced, paused: ids` when forced).

## Decisions and notes
- The draft test opens a one-off HikariCP data source (pool of 1, read-only, 10 s timeout) and closes it, so a draft never enters the pool cache keyed by connection id.
- The typed password lives only for the call: not sealed, not logged, not audited; driver errors go through the redactor and any literal occurrence of the password becomes `****` (docs/04-data-protection.md). The saved-connection test now redacts its error the same way.
- Forced delete pauses the dependent SELECT monitors instead of deleting them: they keep their definition and can be pointed to another connection.

## Changelog
- 2026-10-24 — draft test, `usedBy` count and 409/force delete (status: done).
