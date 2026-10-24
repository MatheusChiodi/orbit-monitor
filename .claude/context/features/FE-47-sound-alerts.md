---
id: FE-47
title: "Sound alerts"
area: frontend
group: "Wall runtime and preferences"
status: done
screens: [preferences, wall]
spec: docs/05-extended-features.md
updated: 2026-10-24
---

# FE-47 · Sound alerts

## Summary
Per-severity sounds and volume, muted by default

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
[preferences](../screens/preferences.md), [wall](../screens/wall.md)

## Code
- `frontend/src/domains/wall/sound/sound.ts`
- `frontend/src/domains/wall/components/SoundToggle/SoundToggle.tsx`
- `frontend/src/domains/wall/components/WallControls/WallControls.tsx`
- `frontend/src/domains/wall/alerts/useWallAlerts.ts`

## Tests
- `frontend/src/domains/wall/sound/sound.test.ts`
- `frontend/src/domains/wall/components/SoundToggle/SoundToggle.test.tsx`
- `frontend/src/domains/wall/alerts/useWallAlerts.test.ts`
- `frontend/src/domains/wall/WallApp/WallApp.test.tsx`

## Decisions and notes
- Muted by default; per-severity Web Audio tones (DOWN 660 Hz, WARN 440 Hz) for new timeline events only — opening the wall never beeps for old events.
- Settings (`orbit.sound`) are a device preference; the toggle is `aria-pressed` with its state as text.

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending test suite written (status: tests-pending).
- 2026-10-18 — sound alerts (status: done).
- 2026-10-24 — toggle shows a speaker icon and its state ("Sound off" / "Sound on"); still `aria-pressed` with the name "Sound alerts".
