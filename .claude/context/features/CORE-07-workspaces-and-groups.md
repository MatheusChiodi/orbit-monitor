---
id: CORE-07
title: "Workspaces and groups"
area: full-stack
group: "Workspace"
status: in-progress
screens: [monitor-list, wall]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-22
---

# CORE-07 · Workspaces and groups

## Summary
Group state = worst monitor state; color, icon, owner, tags.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md), [wall](../screens/wall.md)

## Code
- `frontend/src/domains/workspace/groups/groups.ts`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/Group.java`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/GroupService.java`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/WorkspaceService.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/WorkspaceController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/web/GroupController.java`
- `backend/orbit-api/src/main/java/io/orbit/api/wall/WallViewFactory.java` (maintenance-aware group state)
- `backend/orbit-api/src/main/java/io/orbit/api/config/WallBeans.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/MonitorDefinitions.java` (`moveToGroup`)
- `backend/config-examples/orbit.workspaces.example.json`

## Tests
- `frontend/src/domains/workspace/groups/groups.test.ts`
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/GroupServiceTest.java`
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/WorkspaceServiceTest.java`
- `backend/orbit-api/src/test/java/io/orbit/api/web/WorkspaceConfigApiTest.java` (workspaces, group order)
- `backend/orbit-api/src/test/java/io/orbit/api/web/AccessAndGroupsApiTest.java`

## Decisions and notes
- Backend: Groups live in `orbit.groups.json` (id, name, color `#rrggbb`, icon, description, owner, tags, order, updatedAt, updatedBy).
- Backend: Group state = worst member state (`MonitorState.worstOf`); no members or no data yet is UNKNOWN.
- Backend: Pending: workspaces as a separate entity, maintenance windows excluded from the state, REST endpoints.
- Frontend: Groups load from `/api/groups` (`orbit.groups.json`, `{ version, items }`) in their configured order; a missing file means no groups.
- Frontend: Group state = worst state of its monitors; a group in maintenance is `MAINTENANCE`, an empty one `EMPTY`.
- Backend: `WorkspaceService` stores workspaces in `orbit.workspaces.json` (id, name, groupIds; schema in orbit-config); a group belongs to at most one workspace; `groupState` ignores monitors in maintenance (worst of the rest, UNKNOWN when none). REST endpoints still pending.

- Backend API: `GET /api/workspaces` → `{ version: 1, items: [{ id, name, groupIds, updatedAt, updatedBy }] }`; `GET /api/workspaces/{id}`; `POST /api/workspaces` (201, 409 when the id exists); `PUT /api/workspaces/{id}` `{ name, groupIds }`; `DELETE /api/workspaces/{id}`. A group listed in two workspaces → 422.
- Backend API: `GET /api/groups` → `GroupResponse[]` (`{ id, name, color, icon, description, owner, tags, order, status, updatedAt, updatedBy, monitorOrder }`, a JSON array as before); `PUT /api/groups/{id}`; `DELETE /api/groups/{id}`; `PUT /api/groups/order` `{ groupIds: [...], monitors?: { groupId: [monitorIds in order] } }` → the reordered list. Listed groups take positions 1..n, unlisted ones follow; `monitorOrder` is stored on the group and a monitor listed under another group is moved there (`MonitorDefinitions.moveToGroup`). Unknown groups or monitors → 422.
- Backend: the group `status` (wall snapshot, `/api/groups`, status pages) ignores monitors in an active maintenance window (by monitor id or by their group, `orbit.maintenance.json`); all members in maintenance → UNKNOWN.
- Remaining (frontend): `groups.ts` `loadGroups` reads `/api/groups` through the config client and expects `{ version, items }`, while `GET /api/groups` returns the array the console already uses (`client.listGroups`); the frontend should use the array (or the lead picks one shape). FE-13 `GroupOrderEditor` still has to call `PUT /api/groups/order`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: groups stored in orbit.groups.json and worst-state rule.
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: groups loader and group state rule.
- 2026-10-18 — backend: pending tests for workspaces and maintenance-aware group state.
- 2026-10-22 — backend: workspaces store and maintenance-aware group state; WorkspaceServiceTest un-pended.
- 2026-10-22 — backend: /api/workspaces CRUD, PUT /api/groups/order (group and monitor order, moves between groups), group state ignores maintenance on the wall and status pages.
