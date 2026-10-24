---
id: BE-56
title: "Bulk monitor actions"
area: backend
group: "Monitors"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# BE-56 · Bulk monitor actions

## Summary
Pause, resume, delete or move many monitors in one call with a per-id result and one audit entry.

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-api/src/main/java/io/orbit/api/web/MonitorActionsController.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/definition/MonitorDefinitions.java`

## Tests
- `backend/orbit-api/src/test/java/io/orbit/api/web/MonitorActionsApiTest.java` (`bulk`, `bulkValidation`)

## API
| Method | Path | Body / response |
|---|---|---|
| POST | `/api/monitors/bulk` | `{ ids: string[], action: "pause" \| "resume" \| "delete" \| "move", groupId?: string }` → 200 `{ action, results: [{ id, ok, error? }] }`; `error` is `not-found` or `failed`; 400 for an unknown action, empty or more than 500 ids, or `move` without an existing `groupId` |

One audit entry `monitor.bulk`: target = `groupId` (move) or none, detail `<action> <n>: id, id`.

## Decisions and notes
- Partial success instead of all-or-nothing: config files are saved per monitor, so each id reports its own outcome and the console can show which failed. Duplicate ids are applied once; the schedule is synced once at the end.
- Tags are out of scope (no monitor tags in the model).

## Changelog
- 2026-10-24 — bulk pause/resume/delete/move (status: done).
