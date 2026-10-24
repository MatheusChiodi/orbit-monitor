---
id: FE-18
title: "Screen previews"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [layout-editor]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-18 · Screen previews

## Summary
1080p, 4K, ultrawide and portrait frames

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[layout-editor](../screens/layout-editor.md)

## Code
- `frontend/src/domains/workspace/layout/previews.ts`

## Tests
- `frontend/src/domains/workspace/layout/previews.test.ts`

## Decisions and notes
- Frames render at their real resolution with the wall's fluid font and are scaled down with `transform: scale()` (never up); 1080p / 4K / ultrawide / portrait radiogroup.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — screen previews (status: done).
- 2026-10-24 — `domains/workspace/ScreenPreview` removed: nothing outside its own tests rendered it (the redesigned layout editor draws its own previews). Previews stay in `layout/previews.ts`; recover the component from commit 33110a0 if a screen needs it.
