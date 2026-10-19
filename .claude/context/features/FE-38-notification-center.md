---
id: FE-38
title: "Notification center"
area: frontend
group: "Console productivity"
status: in-progress
screens: [incidents]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-38 · Notification center

## Summary
In-app incident feed and toasts

## Status
- [x] Tests written (pending or active)
- [ ] Implemented
- [ ] All tests green, none pending

## Screens
[incidents](../screens/incidents.md)

## Code
- `frontend/src/domains/alerting/NotificationCenter/NotificationCenter.tsx`
- `frontend/src/domains/alerting/NotificationCenter/Toaster.tsx`
- `frontend/src/shared/ui/Button/Button.tsx`

## Tests
- `frontend/src/domains/alerting/NotificationCenter/NotificationCenter.test.tsx`

## Decisions and notes
- Bell states the unread count in text; the feed lists newest first with state labels and relative time; Escape returns focus to the bell; titles and details go through `SafeValue`.
- Toasts live in a polite region, enter/leave with the toast preset (FE-51) and auto-dismiss after 6 s.
- Pending: wiring to the console header with the backend incident feed.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — notification center and toaster components (status: in-progress).
