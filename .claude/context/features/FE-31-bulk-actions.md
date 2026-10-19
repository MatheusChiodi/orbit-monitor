---
id: FE-31
title: "Bulk actions"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-31 · Bulk actions

## Summary
Multi-select to pause, tag, move or delete with confirmation

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/domains/workspace/BulkActions/BulkActions.tsx`

## Tests
- `frontend/src/domains/workspace/BulkActions/BulkActions.test.tsx`

## Decisions and notes
- The bulk bar appears only in edit mode with a selection; delete asks for confirmation in an `alertdialog` with focus on Cancel.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — bulk actions (status: done).
