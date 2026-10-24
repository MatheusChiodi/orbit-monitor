---
id: FE-65
title: "Connections UI"
area: frontend
group: "Console redesign"
status: done
screens: [admin-connections, monitor-editor-sql]
spec: docs/02-features.md §6
updated: 2026-10-24
---

# FE-65 · Connections UI

## Summary
Database connections can be listed, added, edited, tested, given a new password and deleted from Settings › Connections, and added straight from the SQL monitor's connection select.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[admin-connections](../screens/admin-connections.md), [monitor-editor-sql](../screens/monitor-editor-sql.md)

## Code
- `frontend/src/domains/connections/ConnectionsSettings/ConnectionsSettings.tsx` (default export, mounted by Settings › Connections)
- `frontend/src/domains/connections/ConnectionDialog/ConnectionDialog.tsx`
- `frontend/src/domains/connections/ConnectionTestStatus/ConnectionTestStatus.tsx`
- `frontend/src/domains/connections/model/connectionModel.ts`
- `frontend/src/shared/api/consoleEndpoints.ts` (`saveConnection`, `deleteConnection`, `testConnection`, `saveGroup`)
- `frontend/src/app/console/consoleSource.ts` (demo connections in memory)

## Tests
- `frontend/src/domains/connections/model/connectionModel.test.ts`
- `frontend/src/domains/connections/ConnectionDialog/ConnectionDialog.test.tsx`
- `frontend/src/domains/connections/ConnectionsSettings/ConnectionsSettings.test.tsx`
- `frontend/src/domains/monitor/components/MonitorForm/TargetFields.test.tsx`

## Decisions and notes
- Backend already had `GET/PUT/DELETE /api/connections[/{id}]` and `POST /{id}/test`; no backend change.
- The password is write-only: typed into `SecretInput` (uncontrolled, `type=password`), sent once, sealed by the server and never read back; on edit an empty password keeps the stored one. A variable name (`passwordEnv`) can replace it.
- Ids are readable slugs of the name (`orders-db`, suffix when taken); the kind (PostgreSQL, MySQL, SQL Server, Oracle) follows the JDBC URL like the server's `Dialect.fromJdbcUrl`.
- A test can take ~10 s when the host is unreachable; the row/select shows "Testing…" then "Connected in N ms" or "Couldn't connect. <reason>". A connection saved from the dialog is tested right away.
- Strings live in the `monitorForm` namespace (`monitorForm.connections.*`) to avoid touching the shared namespace list during the redesign.
- Query key `['connections', demo]` is shared with the monitor form, so a connection added in Settings appears in the SQL select and vice versa.

## Changelog
- 2026-10-24 — connections settings, add/edit dialog, test status and the "Add connection" entry in the SQL target (status: done).
