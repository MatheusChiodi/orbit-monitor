---
id: FE-13
title: "Reorder monitors and groups"
area: frontend
group: "Drag and drop and layout"
status: in-progress
screens: [monitor-list, wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-13 · Reorder monitors and groups

## Summary
Drag inside the matrix and between groups

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md), [wall](../screens/wall.md)

## Code
- `frontend/src/domains/workspace/reorder/reorder.ts`
- `frontend/src/domains/workspace/GroupOrderEditor/GroupOrderEditor.tsx`

## Tests
- `frontend/src/domains/workspace/reorder/reorder.test.ts`
- `frontend/src/domains/workspace/GroupOrderEditor/GroupOrderEditor.test.tsx`

## Decisions and notes
- Each group is a listbox: Space grab/drop, ↑/↓ within the group, ←/→ to the next group, Esc cancels, every move announced; `onChange` receives the full order only on drop.
- Pending: persistence through `/api/groups` and the matrix wall order.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — reorder helpers and group order editor (status: in-progress).
