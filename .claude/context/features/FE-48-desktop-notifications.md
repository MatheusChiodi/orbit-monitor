---
id: FE-48
title: "Desktop notifications"
area: frontend
group: "Wall runtime and preferences"
status: done
screens: [preferences]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-48 · Desktop notifications

## Summary
Opt-in browser notifications for new incidents

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[preferences](../screens/preferences.md)

## Code
- `frontend/src/domains/alerting/desktopNotifications/desktopNotifications.ts`
- `frontend/src/domains/wall/components/WallControls/WallControls.tsx`
- `frontend/src/domains/wall/alerts/useWallAlerts.ts`

## Tests
- `frontend/src/domains/alerting/desktopNotifications/desktopNotifications.test.ts`
- `frontend/src/domains/wall/alerts/useWallAlerts.test.ts`

## Decisions and notes
- Opt-in from the wall header; asks browser permission and remembers the choice on the device; one silent notification per new unacknowledged incident, tagged by incident id, title/body in the UI language and redacted (never card data).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — desktop notifications (status: done).
- 2026-10-24 — the wall offers the opt-in only to clients with edit access (`WallApp loadAccess`, one shared `/api/access` request in `wall-main`) and never in kiosk mode.
