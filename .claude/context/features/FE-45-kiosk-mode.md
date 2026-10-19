---
id: FE-45
title: "Kiosk mode"
area: frontend
group: "Wall runtime and preferences"
status: done
screens: [wall]
spec: docs/05-extended-features.md
updated: 2026-10-18
---

# FE-45 · Kiosk mode

## Summary
Fullscreen, hidden cursor, Screen Wake Lock, auto-reconnect

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[wall](../screens/wall.md)

## Code
- `frontend/src/domains/wall/kiosk/kiosk.ts`
- `frontend/src/domains/wall/WallApp/WallApp.tsx`
- `frontend/src/app/wall-main.tsx`
- `frontend/src/app/theme.css`

## Tests
- `frontend/src/domains/wall/kiosk/kiosk.test.ts`
- `frontend/src/domains/wall/WallApp/WallApp.test.tsx`

## Decisions and notes
- `?kiosk=1` enters kiosk mode: fullscreen (when the browser allows it), Screen Wake Lock re-acquired on `visibilitychange`, cursor hidden after 3 s still; works without the Wake Lock API.
- Auto-reconnect comes from the WebSocket client (CORE-09).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — kiosk mode (status: done).
