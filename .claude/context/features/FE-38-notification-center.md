---
id: FE-38
title: "Notification center"
area: frontend
group: "Console productivity"
status: done
screens: [incidents]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-38 · Notification center

## Summary
In-app incident feed and toasts

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[incidents](../screens/incidents.md)

## Code
- `frontend/src/domains/alerting/NotificationCenter/NotificationCenter.tsx`
- `frontend/src/domains/alerting/NotificationCenter/Toaster.tsx`
- `frontend/src/shared/ui/Button/Button.tsx`
- `frontend/src/app/console/NotificationsBell/NotificationsBell.tsx`
- `frontend/src/app/console/NotificationsBell/incidentFeed.ts`
- `frontend/src/app/console/ConsoleHeader/ConsoleHeader.tsx`
- `frontend/src/app/console-main.tsx`

## Tests
- `frontend/src/domains/alerting/NotificationCenter/NotificationCenter.test.tsx`
- `frontend/src/domains/alerting/NotificationCenter/NotificationCenter.link.test.tsx`
- `frontend/src/app/console/NotificationsBell/incidentFeed.test.ts`
- `frontend/src/app/console/ConsoleApp.routes.test.tsx`

## Decisions and notes
- Bell states the unread count in text; the feed lists newest first with state labels and relative time; Escape returns focus to the bell; titles and details go through `SafeValue`.
- Toasts live in a polite region, enter/leave with the toast preset (FE-51) and auto-dismiss after 6 s.
- Console header bell: the feed is built from `/api/incidents` (polled every 15 s) — OPENED, SEVERITY_CHANGED, REOPENED and RESOLVED become notifications linking to `#/incidents/:id`; operator actions are not notified. `console-main` connects the wall WebSocket and any incident/event/snapshot message refreshes the feed at once.
- Read marks live in memory only (no browser storage); the first load fills the bell, later arrivals also raise toasts.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — notification center and toaster components (status: in-progress).
- 2026-10-22 — bell wired into the console header with the incident feed and the wall WebSocket (status: done).
