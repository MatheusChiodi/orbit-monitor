---
id: FE-11
title: "Wall layout editor"
area: frontend
group: "Drag and drop and layout"
status: in-progress
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-11 · Wall layout editor

## Summary
12-column grid, snapping, resize handles, collision resolution

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/workspace/layout/grid.ts`
- `frontend/src/domains/workspace/layout/layoutsApi.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.tsx`

## Tests
- `frontend/src/domains/workspace/layout/grid.test.ts`
- `frontend/src/domains/workspace/layout/layoutsApi.test.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.test.tsx`

## Decisions and notes
- 12-column grid with snapping; blocks stay inside the columns and overlapped blocks cascade down, so layouts never overlap.
- Layouts are read and saved only through `/api/layouts` (`{version, items}`, missing file = empty, `PUT /api/layouts/{id}`); view-only grids are `aria-readonly` without Save.
- Pending: console route and wall rendering of saved layouts (BE-41).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — layout editor, grid and layouts API client (status: in-progress).
