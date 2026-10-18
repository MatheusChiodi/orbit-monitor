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

## Tests
- `backend/orbit-workspace/src/test/java/io/orbit/workspace/GroupServiceTest.java`

## Decisions and notes
- Backend: Groups live in `orbit.groups.json` (id, name, color `#rrggbb`, icon, description, owner, tags, order, updatedAt, updatedBy).
- Backend: Group state = worst member state (`MonitorState.worstOf`); no members or no data yet is UNKNOWN.
- Backend: Pending: workspaces as a separate entity, maintenance windows excluded from the state, REST endpoints.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — backend: groups stored in orbit.groups.json and worst-state rule.
