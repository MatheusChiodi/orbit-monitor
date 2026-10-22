---
id: FE-41
title: "Maintenance calendar"
area: frontend
group: "Console productivity"
status: in-progress
screens: [maintenance-calendar]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-41 · Maintenance calendar

## Summary
Drag on a calendar to create a maintenance window

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [ ] All tests green, none pending

## Screens
[maintenance-calendar](../screens/maintenance-calendar.md)

## Code
- `frontend/src/domains/alerting/MaintenanceCalendar/MaintenanceCalendar.tsx`
- `frontend/src/domains/alerting/MaintenanceCalendar/slots.ts`
- `frontend/src/app/console/screens/MaintenanceScreen/MaintenanceScreen.tsx`
- `frontend/src/app/console/screens/MaintenanceScreen/maintenanceItems.ts`

## Tests
- `frontend/src/domains/alerting/MaintenanceCalendar/MaintenanceCalendar.test.tsx`
- `frontend/src/app/console/screens/MaintenanceScreen/maintenanceItems.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Decisions and notes
- Week grid of 30-minute cells; drag or Enter → Shift+arrows → Enter creates a window; weekday names from `Intl`; view-only cannot create.
- Route `#/maintenance` with previous/this/next week; one-off windows (`start`/`end`) of `orbit.maintenance.json` are drawn, cron windows are left to the backend; a new window is `{id: mw-…, name, targets: [groupId], start, end}`.
- Assumed contract (BE-31, controller not in the backend yet): `GET /api/maintenance` returns an array or `{version, items}` (404 = empty), `PUT /api/maintenance/{id}` upserts, `DELETE /api/maintenance/{id}` removes — same style as groups/layouts. Remaining: verify against the BE-31 controller once it exists; then done.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — maintenance calendar component (status: in-progress).
- 2026-10-22 — `#/maintenance` screen wired through TanStack Query to the assumed `/api/maintenance` contract (status: in-progress until BE-31 exposes it).
