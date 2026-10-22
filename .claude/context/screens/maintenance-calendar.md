---
screen: maintenance-calendar
title: "Maintenance calendar"
route: "index.html#/maintenance"
status: in-progress
spec: FE-41, BE-31
updated: 2026-10-22
---

# Maintenance calendar

## Purpose
Drag on a calendar to create one-off/recurring maintenance windows.

## Layout and components
`MaintenanceScreen` (week navigation, `/api/maintenance` query and save) → `MaintenanceCalendar`.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [FE-41 · Maintenance calendar](../features/FE-41-maintenance-calendar.md) — in-progress

## Code
- `frontend/src/app/console/screens/MaintenanceScreen/MaintenanceScreen.tsx`
- `frontend/src/domains/alerting/MaintenanceCalendar/MaintenanceCalendar.tsx`

## Tests
- `frontend/src/app/console/screens/MaintenanceScreen/maintenanceItems.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — screen routed and wired to the assumed `/api/maintenance` contract (status: in-progress).
