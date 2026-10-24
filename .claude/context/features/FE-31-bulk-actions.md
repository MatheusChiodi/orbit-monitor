---
id: FE-31
title: "Bulk actions"
area: frontend
group: "Console productivity"
status: done
screens: [monitor-list]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-31 · Bulk actions

## Summary
Multi-select to pause/resume, move or delete with confirmation

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[monitor-list](../screens/monitor-list.md)

## Code
- `frontend/src/domains/workspace/BulkActions/BulkActions.tsx`
- `frontend/src/app/console/screens/MonitorsScreen/MonitorsScreen.tsx`
- `frontend/src/app/console/screens/MonitorDetailScreen/monitorActions.ts`

## Tests
- `frontend/src/domains/workspace/BulkActions/BulkActions.test.tsx`

## Decisions and notes
- The bulk bar appears only in edit mode with a selection; move and delete go through the `Dialog` primitive (delete: focus on Cancel, danger button names the count).
- Tag was dropped: the API has no monitor tags. Pause/resume re-saves each definition with `paused` (`POST /api/monitors`, body from `monitorActions.pausedBody`, which reuses the edit form's `stateFromDefinition` + `buildDefinition` and keeps extras and unreadable conditions); move uses `PUT /api/groups/order`; delete `DELETE /api/monitors/{id}`. One request per monitor, one toast for the result.
- Mounted on the Monitors screen with row and per-group checkboxes in `GroupList`.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — bulk actions (status: done).
- 2026-10-24 — mounted on the Monitors screen; Dialog/Select primitives; pause and resume through the save endpoint; tag removed.
