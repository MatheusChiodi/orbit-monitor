---
id: FE-09
title: "Night mode schedule"
area: frontend
group: "Theming and personalization"
status: done
screens: [preferences, wall]
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# FE-09 · Night mode schedule

## Summary
Dim the wall between configurable hours

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [wall](../screens/wall.md)

## Code
- `frontend/src/domains/wall/display/nightMode.tsx`
- `frontend/src/domains/wall/display/index.ts`
- `frontend/src/domains/wall/WallApp/WallApp.tsx` (`nightMode` prop)
- `frontend/src/app/wall-main.tsx` (`?night=22:00-06:00`)

## Tests
- `frontend/src/domains/wall/display/nightMode.test.tsx`
- `frontend/src/domains/wall/WallApp/WallApp.nightMode.test.tsx`

## Decisions and notes
- A fixed black overlay with `opacity = 1 − dimTo` and `pointer-events: none` dims the wall without hiding it; `dimTo` is clamped to 0.3–1 so the wall stays readable.
- Windows that cross midnight are supported (`22:00–06:00`); `from === to` means no window. Times are local `HH:MM`, validated by `parseSchedule` (invalid → null).
- Exceptions first: an unacknowledged DOWN incident lifts the dimming immediately.
- A small "Night mode" status label stays visible; the fade uses a 600 ms opacity transition and is instant at animation level `off`.
- Schedule source today: `?night=` on the wall URL; per-layout schedules (`orbit.layouts.json`, BE-41) can feed the same `nightMode` prop.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-22 — implemented night mode schedule, overlay and wall wiring (status: done).
