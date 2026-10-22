---
screen: incidents
title: "Incident list"
route: "index.html#/incidents"
status: done
spec: docs/02-features.md §4
updated: 2026-10-22
---

# Incident list

## Purpose
Open/closed incidents, filters, acknowledge, notification center.

## Layout and components
`ConsoleRoutes` → `IncidentsScreen` (open list, resolved list; each row links to `#/incidents/:id`). The header bell (`NotificationsBell` → `NotificationCenter` + `Toaster`) shows the same incidents as a feed on every console screen.

## States
- Loading, empty, error, stale data
- i18n: en / pt-BR
- Animation level: off / minimal / standard / expressive
- Privacy: every probe value rendered through `<SafeValue>`

## Features on this screen
- [CORE-06 · Incidents and acknowledgement](../features/CORE-06-incidents-and-acknowledgement.md) — in-progress
- [FE-38 · Notification center](../features/FE-38-notification-center.md) — done

## Code
- `frontend/src/app/console/screens/IncidentsScreen/IncidentsScreen.tsx`
- `frontend/src/app/console/NotificationsBell/NotificationsBell.tsx`
- `frontend/src/app/console/ConsoleHeader/ConsoleHeader.tsx`

## Tests
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`
- `frontend/src/app/console/NotificationsBell/incidentFeed.test.ts`

## Changelog
- 2026-10-18 — context file created.
- 2026-10-22 — incident list route and header notification bell built (status: done).
