---
id: FE-13
title: "Reorder monitors and groups"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [monitor-list, wall]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-13 · Reorder monitors and groups

## Summary
Drag inside the matrix and between groups

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md), [wall](../screens/wall.md)

## Code
- `frontend/src/domains/workspace/reorder/reorder.ts`
- `frontend/src/domains/workspace/GroupOrderEditor/GroupOrderEditor.tsx`
- `frontend/src/app/console/screens/MonitorsScreen/MonitorsScreen.tsx`
- `frontend/src/shared/api/consoleEndpoints.ts`

## Tests
- `frontend/src/domains/workspace/reorder/reorder.test.ts`
- `frontend/src/domains/workspace/GroupOrderEditor/GroupOrderEditor.test.tsx`
- `frontend/src/domains/workspace/GroupOrderEditor/GroupOrderEditor.groups.test.tsx`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`
- `frontend/src/shared/api/consoleEndpoints.test.ts`

## Decisions and notes
- Each group is a listbox: Space grab/drop, ↑/↓ within the group, ←/→ to the next group, Esc cancels, every move announced; `onChange` receives the full order only on drop.
- Monitor list → "Reorder" (edit mode only) swaps the group list for `GroupOrderEditor`; groups move with "Move {group} up/down" buttons (announced), monitors with the keyboard/drag listbox. Every drop sends one `PUT /api/groups/order {groupIds, monitors}` (GroupController, CORE-07) and the group and monitor queries refresh; the wall reads the same persisted order from the snapshot.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — reorder helpers and group order editor (status: in-progress).
- 2026-10-22 — group and monitor order persisted through PUT /api/groups/order from the console (status: done).
