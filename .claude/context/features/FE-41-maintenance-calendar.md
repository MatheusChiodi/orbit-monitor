---
id: FE-41
title: "Maintenance calendar"
area: frontend
group: "Console productivity"
status: in-progress
screens: [maintenance-calendar]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-41 · Maintenance calendar

## Summary
Drag on a calendar to create a maintenance window

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[maintenance-calendar](../screens/maintenance-calendar.md)

## Code
- `frontend/src/domains/alerting/MaintenanceCalendar/MaintenanceCalendar.tsx`
- `frontend/src/domains/alerting/MaintenanceCalendar/slots.ts`

## Tests
- `frontend/src/domains/alerting/MaintenanceCalendar/MaintenanceCalendar.test.tsx`

## Decisions and notes
- Week grid of 30-minute cells; drag or Enter → Shift+arrows → Enter creates a window; weekday names from `Intl`; view-only cannot create.
- Pending: `/api/maintenance` wiring and the screen route.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — maintenance calendar component (status: in-progress).
