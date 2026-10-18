---
id: CORE-07
title: "Workspaces and groups"
area: full-stack
group: "Workspace"
status: in-progress
screens: [monitor-list, wall]
spec: docs/01-architecture.md, docs/02-features.md, docs/04-data-protection.md
updated: 2026-10-18
---

# CORE-07 · Workspaces and groups

## Summary
Group state = worst monitor state; color, icon, owner, tags.

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md), [wall](../screens/wall.md)

## Code
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/Group.java`
- `backend/orbit-workspace/src/main/java/io/orbit/workspace/GroupService.java`
- `backend/config-examples/orbit.groups.example.json`
- `frontend/src/domains/workspace/groups/groups.ts`

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/GroupServiceTest.java`
- `frontend/src/domains/workspace/groups/groups.test.ts`

## Decisions and notes
- Backend: Groups live in `orbit.groups.json` (id, name, color `#rrggbb`, icon, description, owner, tags, order, updatedAt, updatedBy).
- Backend: Group state = worst member state (`MonitorState.worstOf`); no members or no data yet is UNKNOWN.
- Backend: Pending: workspaces as a separate entity, maintenance windows excluded from the state, REST endpoints.
- Frontend: Groups load from `/api/groups` (`orbit.groups.json`, `{ version, items }`) in their configured order; a missing file means no groups.
- Frontend: Group state = worst state of its monitors; a group in maintenance is `MAINTENANCE`, an empty one `EMPTY`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: groups stored in orbit.groups.json and worst-state rule.
- 2026-10-18 — frontend: pending test suite written.
- 2026-10-18 — frontend: groups loader and group state rule.
