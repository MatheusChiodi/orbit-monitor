---
screen: incidents
title: "Incident list"
route: "index.html#/incidents"
status: done
spec: docs/02-features.md §4
updated: 2026-10-24
---

# Incident list

## Purpose
Open/closed incidents, filters, acknowledge, notification center.

## Layout and components
`ConsoleRoutes` → `IncidentsScreen` (PageHeader) → `IncidentList`: SegmentedControl filter (All · Open · Acknowledged · Resolved, with counts), one row per incident with StatusBadge, monitor link, state line ("Not acknowledged", "Acknowledged at HH:MM" or "Resolved at HH:MM · lasted X"), opened time, and Acknowledge (secondary) / Resolve (ghost, editors only) buttons. EmptyState per filter. The header bell shows the same incidents as a feed.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-06 · Incidents and acknowledgement](../features/CORE-06-incidents-and-acknowledgement.md) — done
- [FE-38 · Notification center](../features/FE-38-notification-center.md) — done

## Code
- `frontend/src/app/console/screens/IncidentsScreen/IncidentsScreen.tsx`
- `frontend/src/app/console/screens/IncidentsScreen/IncidentList.tsx`
- `frontend/src/app/console/screens/IncidentsScreen/incidentFilters.ts`
- `frontend/src/domains/alerting/locales/en.json`
- `frontend/src/app/console/NotificationsBell/NotificationsBell.tsx`

## Tests
- `frontend/src/app/console/screens/IncidentsScreen/IncidentList.test.tsx`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`
- `frontend/src/app/console/NotificationsBell/incidentFeed.test.ts`

## Decisions and notes
- Filters: Open = open and not acknowledged; Acknowledged = open and acknowledged; Resolved = closed; All is the default.
- Acknowledge is never the danger color (UX audit); every client may acknowledge, only editors resolve (BE-26).
- Success is a toast ("Incident acknowledged"); errors stay inline (role=alert). New strings live in the `ops` i18n namespace (`domains/alerting/locales`).

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — incident list route and header notification bell built (status: done).
- 2026-10-24 — redesign: PageHeader, state filters, acknowledge/resolve in the list, "Resolved at · lasted", empty states.
