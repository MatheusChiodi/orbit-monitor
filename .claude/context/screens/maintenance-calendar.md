---
screen: maintenance-calendar
title: "Maintenance calendar"
route: "index.html#/maintenance"
status: done
spec: FE-41, BE-31
updated: 2026-10-24
---

# Maintenance calendar

## Purpose
Drag on a calendar to create one-off/recurring maintenance windows.

## Layout and components
`MaintenanceScreen` (PageHeader with the silencing note, `/api/maintenance/occurrences` query and save) → `MaintenanceCalendar`: toolbar (week range, previous / this / next week, "New window" primary), the week's windows in words, a week grid (sticky day headers with dates, today marked with aria-current, hour axis, 30-min cells, windows drawn as blocks per day, now marker) and `WindowDialog` (name, group, starts, ends, reason) opened by the button or by a drag / keyboard selection.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [FE-41 · Maintenance calendar](../features/FE-41-maintenance-calendar.md) — done

## Code
- `frontend/src/app/console/screens/MaintenanceScreen/MaintenanceScreen.tsx`
- `frontend/src/app/console/screens/MaintenanceScreen/maintenanceItems.ts`
- `frontend/src/domains/alerting/MaintenanceCalendar/MaintenanceCalendar.tsx`
- `frontend/src/domains/alerting/MaintenanceCalendar/WindowDialog.tsx`
- `frontend/src/domains/alerting/MaintenanceCalendar/weekGrid.ts`
- `frontend/src/domains/alerting/MaintenanceCalendar/slots.ts`

## Tests
- `frontend/src/domains/alerting/MaintenanceCalendar/MaintenanceCalendar.test.tsx`
- `frontend/src/app/console/screens/MaintenanceScreen/maintenanceItems.test.ts`
- `frontend/src/app/console/ConsoleApp.screens.test.tsx`

## Decisions and notes
- Creation by button and form is the main path; dragging is a shortcut that pre-fills the same Dialog.
- Keyboard: one tab stop (roving tabindex), arrows move, Enter starts a selection, Shift+Up/Down extends, Enter confirms, Esc cancels.
- Native `datetime-local` inputs (local time) for start and end; the end must be after the start; reason is optional and sent only when filled.
- Window blocks are aria-hidden decoration; the same windows are listed in words above the grid. The grid scrolls to 07:00 on open.

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — screen routed and wired to the assumed `/api/maintenance` contract (status: in-progress).
- 2026-10-22 — verified against the BE-31 API; cron occurrences shown (status: done).
- 2026-10-24 — redesign: real week calendar (day headers, hour axis, today and now markers), "New window" button with Dialog form, drag kept as a shortcut.
- 2026-10-24 — the hidden hour-axis column header keeps its grid column, so day headers line up with their columns.
