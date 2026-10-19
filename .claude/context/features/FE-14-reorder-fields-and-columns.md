---
id: FE-14
title: "Reorder fields and columns"
area: frontend
group: "Drag and drop and layout"
status: done
screens: [data-and-display]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-14 · Reorder fields and columns

## Summary
Drag fields in *Data & display* and table columns

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[data-and-display](../screens/data-and-display.md)

## Code
- `frontend/src/domains/workspace/reorder/reorder.ts`
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.tsx`

## Tests
- `frontend/src/domains/monitor/components/DataDisplayStep/DataDisplayStep.reorder.test.tsx`

## Decisions and notes
- "Reorder {field}" buttons work on a local draft and report on drop; Esc discards; row edits are keyed by field name instead of position.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — field reordering in Data & display (status: done).
