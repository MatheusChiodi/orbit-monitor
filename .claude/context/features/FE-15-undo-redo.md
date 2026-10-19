---
id: FE-15
title: "Undo/redo"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-15 · Undo/redo

## Summary
`Ctrl+Z` / `Ctrl+Shift+Z` in the layout editor, bounded history

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/workspace/layout/history.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.tsx`

## Tests
- `frontend/src/domains/workspace/layout/history.test.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.test.tsx`

## Decisions and notes
- Immutable history bounded at 50 states; equal states are not pushed; Ctrl+Z / Ctrl+Shift+Z and buttons; one drop or one template = one undoable change.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — undo/redo (status: done).
