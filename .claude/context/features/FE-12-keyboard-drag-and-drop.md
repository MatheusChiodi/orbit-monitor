---
id: FE-12
title: "Keyboard drag and drop"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-12 · Keyboard drag and drop

## Summary
Space to grab, arrows to move/resize, Esc to cancel; screen reader announcements

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/workspace/layout/keyboardDrag.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.tsx`

## Tests
- `frontend/src/domains/workspace/layout/keyboardDrag.test.ts`
- `frontend/src/domains/workspace/LayoutEditor/LayoutEditor.test.tsx`

## Decisions and notes
- Pure reducer: Space grabs/drops, arrows move, Shift+arrows resize, Esc restores; announcements (1-based column/row) in an assertive status; the grabbed block uses the FE-51 drag preset.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — keyboard drag and drop (status: done).
